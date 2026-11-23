import { useEffect,useRef,useState } from 'react';
import { activeTheme } from '../assets/theme.js';

const mode = language => 'place-'+language;
const extensions = {c:'c',cpp:'cpp',python:'py'};
const configured = new WeakSet();
const pythonKeywords = 'and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield';
const nativeKeywords = 'alignas alignof asm auto break case catch class const constexpr consteval constinit continue default delete do else enum explicit extern for friend goto if inline namespace new noexcept operator private protected public register requires restrict return sizeof static struct switch template this throw try typedef typename union using virtual volatile while';
const rules = (python) => ({
  keywords:(python ? pythonKeywords : nativeKeywords).split(' '),
  types:(python ? 'bool bytearray bytes complex dict float frozenset int list object set str tuple type' :
    'bool char double float int int64_t long short signed size_t string uint64_t unsigned vector void wchar_t').split(' '),
  constants:(python ? 'None True False' : 'NULL false nullptr true').split(' '),
  tokenizer:{
    root:[
      [python ? /#.*$/ : /\/\/.*$/, 'comment'],
      ...(python ? [[/"""|'''/, {token:'string',next:'@triple',nextEmbedded:undefined}]] : [[/\/\*/, 'comment', '@block']]),
      [/\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)[uUlLfF]*/, 'number'],
      [/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/, 'string'],
      [/\b[A-Za-z_]\w*(?=\s*\()/,{cases:{'@keywords':'keyword','@types':'type','@default':'function'}}],
      [/\b[A-Za-z_]\w*/,{cases:{'@keywords':'keyword','@types':'type','@constants':'number','@default':'identifier'}}],
      [/[{}()[\].,;]+/,'delimiter'],
    ],
    block:[[/\*\//,'comment','@pop'],[/[^*]+|\*/,'comment']],
    triple:[[/"""|'''/,'string','@pop'],[/./,'string']],
  },
});

function configure(monaco) {
  if (configured.has(monaco)) return;
  configured.add(monaco);
  for (const language of Object.keys(extensions)) {
    monaco.languages.register({id:mode(language)});
    monaco.languages.setMonarchTokensProvider(mode(language),rules(language === 'python'));
    monaco.languages.setLanguageConfiguration(mode(language),{
      comments:language === 'python' ? {lineComment:'#'} : {lineComment:'//',blockComment:['/*','*/']},
      brackets:[['{','}'],['[',']'],['(',')']],
      autoClosingPairs:['{}','[]','()','""',"''"].map(([open,close]) => ({open,close})),
      indentationRules:language === 'python'
        ? {increaseIndentPattern:/:\s*(?:#.*)?$/,decreaseIndentPattern:/^\s*(?:elif|else|except|finally)\b/}
        : {increaseIndentPattern:/[{[(]\s*$/,decreaseIndentPattern:/^\s*[}\])]/},
    });
  }
}

function syncTheme(monaco) {
  const styles = getComputedStyle(document.documentElement);
  const token = key => styles.getPropertyValue(key).trim();
  monaco.editor.defineTheme('place-editor',{
    base:activeTheme() === 'dark' ? 'vs-dark' : 'vs',
    inherit:true,
    rules:['keyword','type','string','number','function','comment'].map(id =>
      ({token:id,foreground:token('--code-'+id).slice(1)})),
    colors:{
      'editor.background':token('--surface'),
      'editor.foreground':token('--text'),
      'editorLineNumber.foreground':token('--muted'),
      'editorLineNumber.activeForeground':token('--text'),
      'editor.lineHighlightBackground':token('--subtle'),
      'editorCursor.foreground':token('--blue'),
      'editorError.foreground':token('--error'),
    },
  });
  monaco.editor.setTheme('place-editor');
}

export function diagnosticLocation(text) {
  const native = text?.match(/(?:^|\n)[^\n]*?code\.(?:c|cpp):(\d+):(\d+):(?: fatal)? error:/);
  if (native) return {line:Number(native[1]),column:Number(native[2])};
  const python = text?.match(/File ["'][^"']*code\.py["'], line (\d+)(?:[^\n]*\n[^\n]*\n( +)\^)?/);
  if (python) return {line:Number(python[1]),column:Math.max(1,(python[2]?.length ?? 4)-3)};
  return null;
}

export function Monaco({value,onChange,language,readOnly,size,diagnostic,jump}) {
  const host = useRef(null), editor = useRef(null), models = useRef(new Map()), views = useRef(new Map());
  const latest = useRef(null);
  latest.current = {value,onChange,language,readOnly,size};
  const [ready,setReady] = useState(false);

  useEffect(() => {
    let cancelled = false, listener;
    const themed = () => editor.current && syncTheme(window.monaco);
    function load() {
      if (cancelled || !window.require?.config) return;
      window.require.config({paths:{vs:'/vendor/monaco/vs'}});
      window.require(['vs/editor/editor.main'],() => {
        if (cancelled) return;
        const {monaco} = window;
        configure(monaco);
        syncTheme(monaco);
        editor.current = monaco.editor.create(host.current,{
          model:null,theme:'place-editor',automaticLayout:true,minimap:{enabled:false},
          ariaLabel:'Solution code',renderLineHighlight:'all',lineNumbers:'on',tabSize:4,
          insertSpaces:true,scrollBeyondLastLine:false,padding:{top:12,bottom:12},
          fontFamily:'JetBrains Mono Variable, JetBrains Mono, ui-monospace, monospace',
        });
        listener = editor.current.onDidChangeModelContent(() => {
          const code = editor.current.getValue();
          if (code !== latest.current.value) latest.current.onChange(code);
        });
        setReady(true);
      },() => {});
    }
    if (document.readyState === 'complete') load();
    else window.addEventListener('load',load,{once:true});
    window.addEventListener('place-theme',themed);
    return () => {
      cancelled = true;
      window.removeEventListener('load',load);
      window.removeEventListener('place-theme',themed);
      listener?.dispose();
      editor.current?.dispose();
      for (const model of models.current.values()) model.dispose();
      models.current.clear();
      views.current.clear();
      editor.current = null;
    };
  },[]);

  useEffect(() => {
    const instance = editor.current;
    if (!ready || !instance) return;
    const monaco = window.monaco;
    if (!models.current.has(language)) models.current.set(language,monaco.editor.createModel(value,mode(language)));
    const model = models.current.get(language);
    const previous = instance.getModel();
    if (previous !== model) {
      if (previous) views.current.set(previous,instance.saveViewState());
      instance.setModel(model);
      if (views.current.has(model)) instance.restoreViewState(views.current.get(model));
    }
    if (model.getValue() !== value) model.setValue(value);
    instance.updateOptions({readOnly,fontSize:size,lineHeight:Math.round(size*22/14)});
    const location = diagnostic && diagnosticLocation(diagnostic);
    const markers = location && location.line > 0 && location.line <= model.getLineCount() ? [{
      severity:monaco.MarkerSeverity.Error,message:'See the diagnostic in Output.',
      startLineNumber:location.line,endLineNumber:location.line,
      startColumn:Math.min(location.column,model.getLineMaxColumn(location.line)),endColumn:model.getLineMaxColumn(location.line)+1,
    }] : [];
    monaco.editor.setModelMarkers(model,'place-judge',markers);
  },[ready,language,value,readOnly,size,diagnostic]);

  useEffect(() => {
    const location = diagnosticLocation(diagnostic);
    if (!jump || !location || !editor.current) return;
    const instance = editor.current;
    instance.setPosition({lineNumber:location.line,column:location.column});
    instance.revealPositionInCenterIfOutsideViewport(instance.getPosition());
    instance.focus();
  // Only move focus when explicitly requested by the student.
  },[jump]);

  return <div className="editor-box" style={{'--code-size':size+'px','--code-leading':Math.round(size*22/14)+'px'}}>
    <div ref={host} className={ready ? 'monaco-host' : 'monaco-host editor-pending'}/>
    {!ready && <textarea className="editor-fallback" aria-label="Solution code" readOnly={readOnly} value={value} onChange={event => onChange(event.target.value)} spellCheck={false}/>}
  </div>;
}
