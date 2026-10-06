import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { openExternal } from '../lib/links';
import { FONT_LINK, htmlCss } from './htmlStyles';

/*
 * Admin-written HTML (policies, CMS pages), which the web injects with
 * dangerouslySetInnerHTML. Here: a non-scrolling WebView that reports its
 * content height. Links open outside the app. Styles: see htmlStyles.js.
 */
export default function HtmlContent({ html, ...cssOptions }) {
  const [height, setHeight] = useState(24);
  const key = JSON.stringify(cssOptions);
  const source = useMemo(
    () => ({
      html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">${FONT_LINK}<style>${htmlCss(JSON.parse(key))}</style></head><body>${html || ''}
<script>(function(){function p(){window.ReactNativeWebView.postMessage(String(Math.ceil(document.body.scrollHeight)));}
new ResizeObserver(p).observe(document.body);window.addEventListener('load',p);if(document.fonts){document.fonts.ready.then(p);}p();})();</script></body></html>`,
    }),
    [html, key],
  );
  return (
    <View style={{ height }}>
      <WebView
        originWhitelist={['*']}
        source={source}
        scrollEnabled={false}
        style={{ backgroundColor: 'transparent' }}
        onMessage={(e) => {
          const h = Number(e.nativeEvent.data);
          if (Number.isFinite(h) && h > 0) setHeight(h);
        }}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith('about:') || req.url.startsWith('data:')) return true;
          openExternal(req.url);
          return false;
        }}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
