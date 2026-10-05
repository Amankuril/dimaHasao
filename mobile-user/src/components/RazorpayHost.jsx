import { useEffect, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeRazorpay } from '../lib/razorpay';

/*
 * Razorpay Checkout in a full-screen WebView. The page loads checkout.js,
 * opens it with the caller's options, and posts the result back:
 * success -> handler(response), payment.failed -> onError, dismiss -> onClose.
 * UPI app intents (upi://, intent://, tez://, phonepe:// ...) go to the OS.
 */
const html = (options) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;background:transparent}</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body><script>
(function(){
  var post=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));};
  try{
    var opts=${JSON.stringify(options)};
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

  useEffect(() => subscribeRazorpay((r) => setReq(r)), []);

  const finish = (msg) => {
    const r = req;
    setReq(null);
    if (!r) return;
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
              if (/^(https?|about|data|blob):/i.test(r.url)) return true;
              Linking.openURL(r.url).catch(() => {});
              return false;
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
