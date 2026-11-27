import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeRazorpay } from '../lib/razorpay';
import { API_ORIGIN } from '../api/client';

/*
 * Razorpay Checkout in a full-screen WebView. The page loads checkout.js,
 * opens it with the caller's options, and posts the result back:
 * success -> handler(response), payment.failed -> onError, dismiss -> onClose.
 * UPI app intents (upi://, intent://, tez://, phonepe:// ...) go to the OS.
 *
 * Redirect mode: netbanking, card 3-D Secure and wallets open a popup window,
 * which a WebView cannot host, so every one of them failed at once ("Payment
 * Failed" before the bank page appeared). With redirect:true the bank page
 * loads in this same WebView and Razorpay POSTs the result to callback_url;
 * the backend turns that into a GET (RETURN_DONE?status=...) that is caught
 * below and handed to the same handler / onError as before. The flow's own
 * verify endpoint still checks the signature.
 */
const RETURN_URL = `${API_ORIGIN}/api/v1/payments/checkout/return`;
const RETURN_DONE = `${API_ORIGIN}/api/v1/payments/checkout/done`;

const readReturn = (url) => {
  if (!url || !url.startsWith(RETURN_DONE)) return null;
  const query = url.split('?')[1] || '';
  const params = {};
  query.split('&').forEach((pair) => {
    if (!pair) return;
    const [k, v = ''] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  if (params.status === 'success' && params.razorpay_payment_id) {
    return {
      type: 'success',
      response: {
        razorpay_payment_id: params.razorpay_payment_id,
        razorpay_order_id: params.razorpay_order_id,
        razorpay_signature: params.razorpay_signature,
      },
    };
  }
  return { type: 'failed', error: { code: params.code, description: params.description || 'Payment failed', reason: params.reason } };
};
const html = (options) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;background:transparent}</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body><script>
(function(){
  var post=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));};
  try{
    var opts=${JSON.stringify(options)};
    opts.redirect=true;
    opts.callback_url=${JSON.stringify(RETURN_URL)};
    opts.handler=function(r){post({type:'success',response:r});};
    opts.modal={ondismiss:function(){post({type:'dismiss'});},escape:true,animation:true,handleback:true};
    var rzp=new Razorpay(opts);
    rzp.on('payment.failed',function(r){post({type:'failed',error:r&&r.error});});
    rzp.open();
  }catch(e){post({type:'failed',error:{description:String(e&&e.message||e)}});}
})();
</script></body></html>`;

export default function RazorpayHost() {
  const insets = useSafeAreaInsets();
  const [req, setReq] = useState(null);

  // The return URL can reach both onShouldStartLoadWithRequest and onLoadStart
  // in one render; settle each payment once so the handler never runs twice.
  const settledRef = useRef(null);

  useEffect(() => subscribeRazorpay((r) => {
    settledRef.current = null;
    setReq(r);
  }), []);

  const finish = (msg) => {
    const r = req;
    if (!r || settledRef.current === r) return;
    settledRef.current = r;
    setReq(null);
    if (msg.type === 'success') r.handler?.(msg.response);
    else if (msg.type === 'failed') r.onError?.(msg.error || { description: 'Payment failed. Please try again.' });
    else r.onClose?.();
  };

  return (
    <Modal visible={Boolean(req)} transparent animationType="fade" onRequestClose={() => finish({ type: 'dismiss' })} statusBarTranslucent>
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {req ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: html(req.checkout), baseUrl: 'https://checkout.razorpay.com' }}
            style={styles.web}
            javaScriptEnabled
            onMessage={(e) => {
              try {
                finish(JSON.parse(e.nativeEvent.data));
              } catch {
                /* ignore */
              }
            }}
            onShouldStartLoadWithRequest={(r) => {
              const result = readReturn(r.url);
              if (result) {
                finish(result);
                return false;
              }
              if (/^(https?|about|data|blob):/i.test(r.url)) return true;
              Linking.openURL(r.url).catch(() => {});
              return false;
            }}
            // Android does not always route a server redirect through
            // onShouldStartLoadWithRequest; catch the return URL here too.
            onLoadStart={(e) => {
              const result = readReturn(e.nativeEvent.url);
              if (result) finish(result);
            }}
            setSupportMultipleWindows={false}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
