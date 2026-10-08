#!/usr/bin/env node
/*
 * First pass of a web -> React Native port: rewrites a file from
 * Frontend/src into its mirrored place under src/, mechanically.
 *
 *   node tools/port.js modules/Food/pages/admin/Coupons.jsx [more files...]
 *   node tools/port.js --force ...      overwrite a file that already exists
 *   node tools/port.js --stdout <file>  print instead of writing
 *
 * Mirroring: modules/<Mod>/<rest> -> src/<mod>/<rest>, shared/<rest> -> src/shared/<rest>,
 * so relative imports between ported files keep working unchanged.
 *
 * What it does:
 * - HTML tags -> components/web.jsx primitives (div -> Div, span -> Span, button ->
 *   Button, input -> Input, select/option -> Select/Option, table -> Table ...),
 *   svg tags -> react-native-svg. `className` is kept (the primitives read it).
 * - lucide-react -> lucide-react-native; <Plus className="..."/> -> <UiIcon as={Plus} className="..."/>
 *   (also `<item.icon className/>` and `<SomethingIcon className/>` locals).
 * - Imports: react-router-dom -> lib/webRouter, sonner / react-hot-toast -> lib/notify,
 *   framer-motion -> lib/motion, @food/api -> api/food, @food/components/ui/* -> components/shadcn,
 *   moduleAuth / Food utils/auth / Taxi adminSession -> admin/session, clsx / tailwind-merge -> lib/tw cn,
 *   CSS imports dropped, image imports copied next to the ported file.
 * - window / document / navigator -> lib/webShim.
 * - Everything it cannot convert safely gets a `// PORT: <what to do>` comment on
 *   the statement. A port is finished when `grep -rn "PORT:" <file>` is empty.
 *
 * Prints a summary of the flags per file.
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const prettier = require('prettier');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.resolve(ROOT, '../Frontend/src');
const SRC = path.join(ROOT, 'src');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const STDOUT = args.includes('--stdout');
const files = args.filter((a) => !a.startsWith('--'));

/* ------------------------------------------------------------ path mapping */

function mirror(webRel) {
  let m;
  const rel = webRel.replace(/\\/g, '/');
  if ((m = rel.match(/^modules\/([A-Za-z0-9]+)\/(.*)$/))) return `${m[1].toLowerCase()}/${m[2]}`;
  if ((m = rel.match(/^shared\/(.*)$/))) return `shared/${m[1]}`;
  return null;
}

const ALIASES = [
  ['@food/api/axios', 'services/api/axios'],
  ['@food/api/config', 'services/api/config'],
  ['@food/api', 'services/api'],
  ['@food', 'modules/Food'],
  ['@delivery', 'modules/DeliveryV2'],
  ['@/assets', 'modules/Taxi/assets'],
  ['@/components', 'modules/Taxi/components'],
  ['@', ''],
];

const EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];

function resolveWeb(spec, fromAbs) {
  let rel = null;
  if (spec.startsWith('.')) rel = path.relative(WEB, path.resolve(path.dirname(fromAbs), spec));
  else {
    for (const [a, b] of ALIASES) {
      if (spec === a || spec.startsWith(`${a}/`)) {
        rel = (b + spec.slice(a.length)).replace(/^\//, '');
        break;
      }
    }
  }
  if (rel == null) return null;
  rel = rel.replace(/\\/g, '/');
  for (const ext of EXTS) {
    const abs = path.join(WEB, rel + ext);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return { rel: rel + ext, abs };
  }
  return { rel, abs: null };
}

/** Web files whose job the app's own modules do (path relative to Frontend/src). */
const KIT = {
  'services/api/index.js': 'api/food',
  'services/api/axios.js': 'api/client',
  'services/api/config.js': 'api/config',
  'services/api/auth.js': 'api/auth',
  'modules/Food/utils/auth.js': 'admin/session',
  'shared/utils/moduleAuth.js': 'admin/session',
  'shared/utils/auth.js': 'admin/session',
  'modules/Taxi/modules/admin/services/adminSession.js': 'admin/session',
  'shared/utils/adminHome.js': 'admin/access',
  'shared/utils/activeModule.js': 'admin/access',
  'shared/components/admin/AdminModuleSwitcher.jsx': 'admin/AdminModuleSwitcher',
  'shared/utils/imageCompressor.js': 'lib/images',
  'shared/utils/emailValidation.js': 'lib/emailValidation',
  'shared/utils/apiError.js': 'lib/apiError',
  'shared/utils/apiCache.js': 'lib/apiCache',
  'modules/Food/utils/utils.ts': 'lib/tw',
  'modules/Food/utils/utils.js': 'lib/tw',
  'modules/Food/lib/utils.js': 'lib/tw',
  'modules/Food/lib/utils.ts': 'lib/tw',
  'shared/constants/brandLogo.js': 'admin/brandLogo',
  'modules/Food/api/config.js': 'api/config',
};
const KIT_PREFIX = [['modules/Food/components/ui/', 'components/shadcn']];

function kitTarget(rel) {
  if (KIT[rel]) return KIT[rel];
  for (const [p, to] of KIT_PREFIX) if (rel.startsWith(p)) return to;
  return null;
}

/* ------------------------------------------------------------- vocabulary */

const TAG = {
  div: 'Div', section: 'Section', article: 'Article', aside: 'Aside', header: 'Header', footer: 'Footer', main: 'Main', nav: 'Nav',
  ul: 'Ul', ol: 'Ol', li: 'Li', form: 'Form', fieldset: 'Fieldset', figure: 'Figure', dl: 'Dl', dt: 'Dt', dd: 'Dd',
  blockquote: 'Div', address: 'Div', details: 'Div', summary: 'Div', picture: 'Div', center: 'Div', menu: 'Ul',
  span: 'Span', p: 'P', h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6', label: 'Label', legend: 'P', caption: 'P', figcaption: 'P',
  strong: 'Strong', b: 'B', em: 'Em', i: 'Em', small: 'Small', code: 'Code', pre: 'Pre', sup: 'Span', sub: 'Span', mark: 'Span',
  time: 'Span', abbr: 'Span', u: 'Span', s: 'Span', del: 'Span', ins: 'Span', kbd: 'Code', q: 'Span', cite: 'Span',
  button: 'Button', input: 'Input', textarea: 'Textarea', select: 'Select', option: 'Option', optgroup: 'Optgroup', img: 'Img', a: 'A',
  table: 'Table', thead: 'Thead', tbody: 'Tbody', tfoot: 'Tfoot', tr: 'Tr', th: 'Th', td: 'Td', br: 'Br', hr: 'Hr',
};
const SVG = {
  svg: 'Svg', path: 'Path', circle: 'Circle', rect: 'Rect', line: 'Line', polyline: 'Polyline', polygon: 'Polygon', g: 'G', defs: 'Defs',
  linearGradient: 'LinearGradient', radialGradient: 'RadialGradient', stop: 'Stop', ellipse: 'Ellipse', text: 'SvgText', tspan: 'TSpan',
  clipPath: 'ClipPath', mask: 'Mask', use: 'Use', pattern: 'Pattern', symbol: 'Symbol',
};
const FLAG_TAGS = new Set(['iframe', 'video', 'audio', 'canvas', 'object', 'embed', 'source', 'track', 'map', 'area', 'dialog', 'script', 'noscript', 'meter', 'progress', 'datalist', 'output', 'colgroup', 'col']);

const DROP_ATTRS = new Set([
  'htmlFor', 'tabIndex', 'role', 'onMouseEnter', 'onMouseLeave', 'onMouseOver', 'onMouseOut', 'onMouseDown', 'onMouseUp', 'onMouseMove',
  'onPointerDown', 'onPointerUp', 'onPointerEnter', 'onPointerLeave', 'onPointerMove', 'draggable', 'onDragStart', 'onDragOver', 'onDrop',
  'onDragEnd', 'onDragLeave', 'onDragEnter', 'spellCheck', 'title', 'loading', 'decoding', 'referrerPolicy', 'rel', 'target', 'noValidate',
  'method', 'action', 'scope', 'dir', 'lang', 'onDoubleClick', 'onContextMenu', 'autoComplete', 'inputMode', 'crossOrigin', 'download',
  'onWheel', 'onTouchStart', 'onTouchEnd', 'onTouchMove', 'onKeyUp', 'onCopy', 'onPaste', 'onCut', 'onMouseDownCapture', 'onClickCapture',
  'suppressHydrationWarning', 'translate', 'hidden', 'onInput', 'onInvalid', 'form', 'formNoValidate', 'onAnimationEnd', 'onTransitionEnd',
  'list', 'pattern', 'size', 'wrap', 'cols', 'contentEditable', 'suppressContentEditableWarning', 'enterKeyHint',
]);

/* lucide-react-native exports */
const LUCIDE = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'node_modules/lucide-react-native/dist/esm/lucide-react-native.mjs'), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/as ([A-Za-z0-9]+)/g)) names.add(m[1]);
  return names;
})();

/* ------------------------------------------------------------------ port */

function relImport(fromMobileRel, toSrcRel) {
  let r = path.relative(path.dirname(fromMobileRel), toSrcRel).replace(/\\/g, '/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r;
}

function portFile(webRel) {
  const webAbs = path.join(WEB, webRel);
  const code = fs.readFileSync(webAbs, 'utf8');
  const isTs = /\.tsx?$/.test(webRel);
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', ...(isTs ? ['typescript'] : []), 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport', 'topLevelAwait'] });
  const mobileBase = mirror(webRel.replace(/\.(jsx?|tsx?)$/, ''));
  if (!mobileBase) throw new Error(`no mirror for ${webRel}`);
  const hasJsx = /<[A-Za-z]/.test(code) && /\.(jsx|tsx)$/.test(webRel) ? true : /\.(jsx|tsx)$/.test(webRel);
  const outRel = `${mobileBase}${hasJsx ? '.jsx' : '.js'}`;
  const flags = [];
  const flag = (p, reason) => {
    const stmt = (p.getStatementParent && p.getStatementParent()) || p;
    const node = stmt.node;
    const text = ` PORT: ${reason}`;
    node.leadingComments = node.leadingComments || [];
    if (!node.leadingComments.some((c) => c.value === text)) node.leadingComments.push({ type: 'CommentLine', value: text });
    const line = p.node?.loc?.start?.line;
    flags.push(`${line || '?'}: ${reason}`);
  };

  const needWeb = new Set();
  const needSvg = new Set();
  let needUiIcon = false;
  const needShim = new Set();
  const extraImports = []; // [source, specifiers[]]
  const lucideLocals = new Set();
  const importedComponents = new Set(); // locals imported from non-lucide modules

  // ---- imports
  traverse(ast, {
    ImportDeclaration(p) {
      const spec = p.node.source.value;
      // CSS
      if (/\.(css|scss|sass|less)$/.test(spec)) {
        p.remove();
        return;
      }
      // assets
      if (/\.(png|jpe?g|webp|gif|svg|mp3|wav|json)$/i.test(spec)) {
        const r = resolveWeb(spec, webAbs);
        if (r?.abs && /\.svg$/i.test(spec)) {
          flag(p, `SVG asset ${spec}: React Native cannot import .svg; use a PNG/WebP copy or react-native-svg`);
          return;
        }
        if (r?.abs) {
          const target = mirror(r.rel);
          if (target) {
            const dest = path.join(SRC, target);
            if (!STDOUT) {
              fs.mkdirSync(path.dirname(dest), { recursive: true });
              if (!fs.existsSync(dest)) fs.copyFileSync(r.abs, dest);
            }
            p.node.source = t.stringLiteral(relImport(outRel, target));
          }
        }
        return;
      }
      p.node.specifiers.forEach((s) => {
        if (s.local && /^[A-Z]/.test(s.local.name) && spec !== 'lucide-react') importedComponents.add(s.local.name);
      });

      // packages
      if (spec === 'lucide-react') {
        p.node.source = t.stringLiteral('lucide-react-native');
        p.node.specifiers.forEach((s) => {
          const imported = s.imported?.name || s.local.name;
          lucideLocals.add(s.local.name);
          if (!LUCIDE.has(imported)) {
            flag(p, `lucide-react-native has no icon "${imported}" (brand icons were removed in lucide 1.x); pick the closest one`);
            s.imported = t.identifier('CircleHelp');
          }
        });
        return;
      }
      if (spec === 'react-router-dom' || spec === 'react-router') {
        const moved = [];
        p.node.specifiers = p.node.specifiers.filter((s) => {
          const n = s.imported?.name;
          if (n === 'Link' || n === 'NavLink') {
            moved.push(s);
            needWeb.add(n === s.local.name ? n : `${n} as ${s.local.name}`);
            return false;
          }
          if (['BrowserRouter', 'Routes', 'Route', 'HashRouter', 'MemoryRouter'].includes(n)) {
            flag(p, `react-router <${n}>: routes are files under src/app (Expo Router); add the route files instead`);
          }
          return true;
        });
        p.node.source = t.stringLiteral(relImport(outRel, 'lib/webRouter'));
        if (!p.node.specifiers.length) p.remove();
        return;
      }
      if (spec === 'sonner' || spec === 'react-hot-toast') {
        p.node.specifiers = p.node.specifiers.filter((s) => s.imported?.name !== 'Toaster');
        p.node.specifiers = p.node.specifiers.map((s) => (t.isImportDefaultSpecifier(s) ? t.importSpecifier(s.local, t.identifier('toast')) : s));
        p.node.source = t.stringLiteral(relImport(outRel, 'lib/notify'));
        if (!p.node.specifiers.length) p.remove();
        return;
      }
      if (spec === 'framer-motion') {
        p.node.specifiers.forEach((s) => {
          const n = s.imported?.name;
          if (!['motion', 'AnimatePresence'].includes(n)) flag(p, `framer-motion ${n} has no port; use Animated from react-native or drop the effect`);
        });
        p.node.source = t.stringLiteral(relImport(outRel, 'lib/motion'));
        return;
      }
      if (spec === 'clsx' || spec === 'classnames' || spec === 'tailwind-merge') {
        p.node.specifiers = p.node.specifiers.map((s) => t.importSpecifier(s.local, t.identifier('cn')));
        p.node.source = t.stringLiteral(relImport(outRel, 'lib/tw'));
        return;
      }
      if (spec === 'axios') {
        p.node.source = t.stringLiteral(relImport(outRel, 'api/client'));
        flag(p, 'axios -> the app client (api/client): same get/post/put/patch/delete and { data } result; axios.create / interceptors / responseType blob have no equivalent');
        return;
      }
      if (spec === 'react-dom') {
        flag(p, 'react-dom (createPortal): render the overlay inside a Modal / the kit Dialog instead');
        p.remove();
        return;
      }
      if (/^(recharts|chart\.js|react-chartjs-2)$/.test(spec)) {
        flag(p, `${spec}: rebuild the chart with react-native-gifted-charts (same data, colours and chart type)`);
        return;
      }
      if (/^(@react-google-maps\/api|@googlemaps\/js-api-loader|leaflet|react-leaflet)$/.test(spec)) {
        flag(p, `${spec}: rebuild with react-native-maps (MapView PROVIDER_GOOGLE, Marker, Polygon, Polyline, Circle)`);
        return;
      }
      if (/^jspdf/.test(spec) || spec === 'html2canvas' || spec === 'file-saver') {
        flag(p, `${spec}: use lib/files (tableToPdf / saveHtmlAsPdf / saveTextFile / saveWorkbook)`);
        return;
      }
      if (spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('@food') || spec.startsWith('@delivery') || spec === '@food/api') {
        const r = resolveWeb(spec, webAbs);
        if (!r) return;
        const kit = kitTarget(r.rel);
        if (kit) {
          if (kit === 'lib/tw') {
            p.node.specifiers = p.node.specifiers.map((s) => (s.imported?.name === 'cn' || t.isImportDefaultSpecifier(s) ? t.importSpecifier(s.local, t.identifier('cn')) : s));
          }
          p.node.source = t.stringLiteral(relImport(outRel, kit));
          return;
        }
        if (!r.abs) {
          flag(p, `import "${spec}" does not resolve in the web source either`);
          return;
        }
        const target = mirror(r.rel.replace(/\.(jsx?|tsx?)$/, ''));
        if (!target) {
          flag(p, `import "${spec}" (${r.rel}) is outside modules/ and shared/; port or replace it`);
          return;
        }
        p.node.source = t.stringLiteral(relImport(outRel, target));
        const exists = ['.js', '.jsx'].some((e) => fs.existsSync(path.join(SRC, target + e)));
        if (!exists) flag(p, `needs ${r.rel} ported (node tools/port.js ${r.rel})`);
      }
    },
  });

  // ---- code
  const isLocalComponentDef = new Set();
  traverse(ast, {
    'FunctionDeclaration|VariableDeclarator'(p) {
      const id = p.node.id;
      if (id && t.isIdentifier(id) && /^[A-Z]/.test(id.name)) {
        const init = p.node.init;
        // `const StatusIcon = item.icon` / `= icons[x]` are icon variables, not component definitions.
        if (t.isVariableDeclarator(p.node) && init && (t.isMemberExpression(init) || t.isConditionalExpression(init) || t.isLogicalExpression(init) || t.isIdentifier(init))) return;
        isLocalComponentDef.add(id.name);
      }
    },
  });

  traverse(ast, {
    JSXElement(p) {
      const open = p.node.openingElement;
      const nameNode = open.name;
      // lowercase intrinsic
      if (t.isJSXIdentifier(nameNode) && /^[a-z]/.test(nameNode.name)) {
        const tag = nameNode.name;
        if (tag === 'style') {
          flag(p, 'inline <style> block removed: carry any rule that matters into the className / style of the elements');
          p.remove();
          return;
        }
        if (FLAG_TAGS.has(tag)) {
          flag(p, `<${tag}> has no React Native element; replace it (video/audio: expo-video/expo-audio, iframe: WebView or link out)`);
          return;
        }
        const mapped = TAG[tag] || SVG[tag];
        if (!mapped) {
          flag(p, `<${tag}> is not mapped`);
          return;
        }
        let finalName = mapped;
        const classAttr = open.attributes.find((a) => t.isJSXAttribute(a) && a.name.name === 'className');
        const classText = classAttr ? (t.isStringLiteral(classAttr.value) ? classAttr.value.value : code.slice(classAttr.value.start, classAttr.value.end)) : '';
        const hasCls = (re) => re.test(` ${classText.replace(/[`'"{}$]/g, ' ')} `);
        if (!SVG[tag] && hasCls(/ fixed /) && hasCls(/ inset-0 /)) {
          finalName = 'Overlay';
          flag(p, 'fixed inset-0 modal -> <Overlay> (a Modal). Give it onClose for the back button; a tall panel inside should be a ScrollDiv with max-h-[90vh]');
        } else if (!SVG[tag]) {
          if (hasCls(/ overflow-(y-)?(auto|scroll) /)) flag(p, 'overflow-y-auto: this element scrolls on the web -> use <ScrollDiv> (or a FlatList for a long list)');
          if (hasCls(/ overflow-x-(auto|scroll) /) && tag !== 'table') flag(p, 'overflow-x-auto: this row scrolls sideways on the web -> use <HScroll> (tables: <Table cols>)');
          if (hasCls(/ fixed /)) flag(p, '`fixed` element: it is now absolute inside its parent; put bars at the screen level (outside the ScrollDiv) or in an Overlay');
          if (hasCls(/ sticky /)) flag(p, '`sticky`: no sticky positioning; move the element outside the scroll view if it must stay visible');
        }
        if (SVG[tag]) needSvg.add(finalName);
        else needWeb.add(finalName);
        nameNode.name = finalName;
        if (p.node.closingElement) p.node.closingElement.name.name = finalName;

        // attributes
        open.attributes = open.attributes.filter((a) => {
          if (!t.isJSXAttribute(a)) return true;
          const an = t.isJSXNamespacedName(a.name) ? `${a.name.namespace.name}:${a.name.name.name}` : a.name.name;
          if (SVG[tag]) {
            if (an === 'className') flag(p, 'className on an svg element: give it width/height/style instead');
            if (an === 'xmlns' || an.startsWith('xmlns')) return false;
            return true;
          }
          if (DROP_ATTRS.has(an)) return false;
          if (/^data-/.test(an) || an === 'aria-hidden' || an === 'aria-expanded' || an === 'aria-controls' || an === 'aria-current' || an === 'aria-pressed' || an === 'aria-selected' || an === 'aria-describedby' || an === 'aria-labelledby' || an === 'aria-live' || an === 'aria-modal' || an === 'aria-haspopup' || an === 'aria-invalid' || an === 'aria-required' || an === 'aria-busy') return false;
          if (an === 'aria-label') {
            a.name = t.jsxIdentifier('accessibilityLabel');
            return true;
          }
          if (an === 'id') {
            a.name = t.jsxIdentifier('nativeID');
            return true;
          }
          if (an === 'dangerouslySetInnerHTML') flag(p, 'dangerouslySetInnerHTML: render the HTML with components/HtmlContent');
          if (an === 'rowSpan') flag(p, 'rowSpan: React Native tables have no row spans; restructure the cell');
          if (an === 'ref') flag(p, 'ref on a host element: check what the web did with it (scrollIntoView, focus, measure, DOM reads)');
          if (an === 'style') flag(p, 'inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")');
          if (an === 'onScroll' && tag !== 'div') return false;
          return true;
        });
        if (tag === 'input') {
          const type = open.attributes.find((a) => t.isJSXAttribute(a) && a.name.name === 'type');
          const v = type && (t.isStringLiteral(type.value) ? type.value.value : null);
          if (v === 'file' || (type && !t.isStringLiteral(type.value))) {
            if (v === 'file') flag(p, '<input type="file">: use pickImage / pickDocument / pickSpreadsheet from lib/files (a button that opens the picker)');
          }
          if (v === 'range' || v === 'color') flag(p, `<input type="${v}">: no native input; build it (color: text field + swatch; range: a slider)`);
        }
        if (tag === 'table') flag(p, '<Table>: set cols={[...]} widths (px) for each column; the table scrolls sideways like the web\'s overflow-x-auto');
        if (tag === 'a') {
          const href = open.attributes.find((a) => t.isJSXAttribute(a) && a.name.name === 'href');
          if (href && t.isStringLiteral(href.value) && href.value.value.startsWith('#')) flag(p, 'anchor link (#...) scrolls the page on the web; drop it or scroll a ref');
        }
        return;
      }

      // icons: imported from lucide, or icon-valued locals rendered with className
      const hasClass = open.attributes.some((a) => t.isJSXAttribute(a) && a.name.name === 'className');
      let iconExpr = null;
      if (t.isJSXIdentifier(nameNode) && lucideLocals.has(nameNode.name)) iconExpr = t.identifier(nameNode.name);
      else if (t.isJSXIdentifier(nameNode) && /Icon$|^Icon$|^Ico$/.test(nameNode.name) && !importedComponents.has(nameNode.name) && !isLocalComponentDef.has(nameNode.name) && hasClass) iconExpr = t.identifier(nameNode.name);
      else if (t.isJSXMemberExpression(nameNode) && /^(icon|Icon|IconComponent|iconComponent)$/.test(nameNode.property.name)) {
        const toExpr = (n) => (t.isJSXMemberExpression(n) ? t.memberExpression(toExpr(n.object), t.identifier(n.property.name)) : t.identifier(n.name));
        iconExpr = toExpr(nameNode);
      }
      if (iconExpr) {
        needUiIcon = true;
        open.name = t.jsxIdentifier('UiIcon');
        open.attributes.unshift(t.jsxAttribute(t.jsxIdentifier('as'), t.jsxExpressionContainer(iconExpr)));
        open.attributes = open.attributes.filter((a) => !(t.isJSXAttribute(a) && (/^aria-/.test(a.name.name) || a.name.name === 'title')));
        if (p.node.closingElement) p.node.closingElement.name = t.jsxIdentifier('UiIcon');
      }
    },

    MemberExpression(p) {
      const o = p.node.object;
      const prop = p.node.property;
      const pn = t.isIdentifier(prop) ? prop.name : t.isStringLiteral(prop) ? prop.value : null;
      if (t.isIdentifier(o, { name: 'window' }) && pn === 'confirm') flag(p, 'window.confirm is synchronous on the web: use `await window.confirmAsync(msg)` (make the handler async)');
      if (t.isIdentifier(o, { name: 'window' }) && pn === 'location') {
        if (p.parentPath.isMemberExpression() && ['href', 'reload', 'assign', 'replace'].includes(p.parent.property?.name)) flag(p, 'window.location navigation/reload: use navigate() or reload the data');
      }
      if (t.isIdentifier(o, { name: 'document' }) && ['getElementById', 'querySelector', 'querySelectorAll', 'createElement', 'body', 'documentElement'].includes(pn)) flag(p, `document.${pn}: DOM access has no React Native equivalent; use refs/state`);
      if (t.isIdentifier(o, { name: 'URL' }) && (pn === 'createObjectURL' || pn === 'revokeObjectURL')) flag(p, 'URL.createObjectURL: a picked file previews with objectUrl(file) (lib/files); a Blob download becomes saveTextFile / saveBase64File');
      if (t.isIdentifier(o, { name: 'XLSX' }) && pn === 'writeFile') flag(p, 'XLSX.writeFile -> saveWorkbook(workbook, filename) from lib/files');
      if (pn === 'scrollIntoView' || pn === 'getBoundingClientRect' || pn === 'focus' && !t.isIdentifier(o)) flag(p, `${pn}(): DOM method; use a ScrollView ref / onLayout / TextInput ref`);
      if (pn === 'files' && t.isMemberExpression(o) && o.property?.name === 'target') flag(p, 'e.target.files: file inputs become pickers (lib/files)');
    },

    NewExpression(p) {
      const c = p.node.callee;
      if (t.isIdentifier(c) && ['FileReader', 'Blob', 'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'Worker', 'WebSocket', 'Notification'].includes(c.name)) flag(p, `new ${c.name}: browser API; see the porting guide`);
      if (t.isIdentifier(c) && c.name === 'Audio') needShim.add('Audio');
      if (t.isIdentifier(c) && c.name === 'CustomEvent') needShim.add('CustomEvent');
      if (t.isMemberExpression(c) && t.isIdentifier(c.object, { name: 'google' })) flag(p, 'google.maps.*: rebuild with react-native-maps');
    },

    Identifier(p) {
      const n = p.node.name;
      if (!['window', 'document', 'navigator', 'alert'].includes(n)) return;
      if (!p.isReferencedIdentifier()) return;
      if (p.scope.hasBinding(n)) return;
      needShim.add(n);
    },

    CallExpression(p) {
      const c = p.node.callee;
      if (t.isIdentifier(c, { name: 'confirm' }) && !p.scope.hasBinding('confirm')) flag(p, 'confirm(): use `await window.confirmAsync(msg)`');
      if (t.isIdentifier(c, { name: 'createPortal' })) {
        flag(p, 'createPortal: render the overlay inside a Modal / the kit Dialog');
      }
    },

    TSTypeAnnotation(p) {
      p.remove();
    },
    TSAsExpression(p) {
      p.replaceWith(p.node.expression);
    },
    TSNonNullExpression(p) {
      p.replaceWith(p.node.expression);
    },
    'TSInterfaceDeclaration|TSTypeAliasDeclaration'(p) {
      p.remove();
    },
    TSTypeParameterInstantiation(p) {
      p.remove();
    },
  });

  // ---- a page's root scrolls (the web's <main className="overflow-y-auto"> did)
  if (/\/pages\//.test(webRel)) {
    const rootFns = [];
    traverse(ast, {
      ExportDefaultDeclaration(p) {
        const d = p.node.declaration;
        if (t.isFunctionDeclaration(d) || t.isArrowFunctionExpression(d) || t.isFunctionExpression(d)) rootFns.push(d);
        else if (t.isIdentifier(d)) {
          const b = p.scope.getBinding(d.name);
          if (b?.path?.isFunctionDeclaration()) rootFns.push(b.path.node);
          else if (b?.path?.isVariableDeclarator() && (t.isArrowFunctionExpression(b.path.node.init) || t.isFunctionExpression(b.path.node.init))) rootFns.push(b.path.node.init);
        }
      },
    });
    rootFns.forEach((fn) => {
      if (!t.isBlockStatement(fn.body)) return;
      const visit = (stmts) =>
        stmts.forEach((st) => {
          if (t.isReturnStatement(st) && t.isJSXElement(st.argument)) {
            const el = st.argument;
            if (t.isJSXIdentifier(el.openingElement.name, { name: 'Div' })) {
              el.openingElement.name.name = 'ScrollDiv';
              if (el.closingElement) el.closingElement.name.name = 'ScrollDiv';
              needWeb.add('ScrollDiv');
            }
          } else if (t.isIfStatement(st)) {
            visit(t.isBlockStatement(st.consequent) ? st.consequent.body : [st.consequent]);
          }
        });
      visit(fn.body.body);
    });
  }

  // ---- add imports
  const body = ast.program.body;
  const lastImport = body.reduce((i, n, idx) => (t.isImportDeclaration(n) ? idx : i), -1);
  const add = [];
  if (needWeb.size || needUiIcon) {
    const specs = [...needWeb].sort().map((n) => {
      const [imp, , local] = n.split(' ');
      return t.importSpecifier(t.identifier(local || imp), t.identifier(imp));
    });
    if (needUiIcon) specs.push(t.importSpecifier(t.identifier('UiIcon'), t.identifier('Icon')));
    add.push(t.importDeclaration(specs, t.stringLiteral(relImport(outRel, 'components/web'))));
  }
  if (needSvg.size) {
    const specs = [...needSvg].sort().map((n) => (n === 'Svg' ? t.importDefaultSpecifier(t.identifier('Svg')) : n === 'SvgText' ? t.importSpecifier(t.identifier('SvgText'), t.identifier('Text')) : t.importSpecifier(t.identifier(n), t.identifier(n))));
    add.push(t.importDeclaration(specs, t.stringLiteral('react-native-svg')));
  }
  if (needShim.size) {
    add.push(t.importDeclaration([...needShim].sort().map((n) => t.importSpecifier(t.identifier(n), t.identifier(n))), t.stringLiteral(relImport(outRel, 'lib/webShim'))));
  }
  extraImports.forEach(([src, specs]) => add.push(t.importDeclaration(specs, t.stringLiteral(src))));
  body.splice(lastImport + 1, 0, ...add);

  const header = `/* Ported from Frontend/src/${webRel} (tools/port.js first pass). */\n`;
  let out = generate(ast, { retainLines: false, comments: true, jsescOption: { minimal: true } }, code).code;
  out = header + out;
  return { outRel, out, flags };
}

async function main() {
  if (!files.length) {
    console.log('usage: node tools/port.js [--force] [--stdout] <path under Frontend/src> ...');
    process.exit(1);
  }
  for (const f of files) {
    const webRel = f.replace(/^.*Frontend\/src\//, '').replace(/^\.\//, '');
    try {
      const { outRel, out, flags } = portFile(webRel);
      let formatted = out;
      try {
        formatted = await prettier.format(out, { parser: 'babel', singleQuote: true, printWidth: 160, trailingComma: 'all', arrowParens: 'always' });
      } catch (e) {
        console.warn(`  prettier failed on ${outRel}: ${e.message.split('\n')[0]}`);
      }
      const dest = path.join(SRC, outRel);
      if (STDOUT) {
        process.stdout.write(formatted);
      } else if (fs.existsSync(dest) && !FORCE) {
        console.log(`skip  src/${outRel} (exists; --force to overwrite)`);
        continue;
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, formatted);
      }
      console.log(`${STDOUT ? '' : 'wrote'} src/${outRel}  (${flags.length} PORT flags)`);
      if (!STDOUT) flags.slice(0, 60).forEach((l) => console.log(`    ${l}`));
    } catch (e) {
      console.error(`FAIL ${webRel}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

main();
