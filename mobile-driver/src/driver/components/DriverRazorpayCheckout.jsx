import { Linking, Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DT } from '../ui/dt';

/*
 * The one payment step that has no native Expo SDK: Razorpay Checkout (checkout.js) in a full-screen WebView.
 * Replaces the web's `new window.Razorpay(options).open()` in DriverWallet's top-up. `request` is
 * `{ checkout, handler, onError, onClose }` or null:
 *   success -> handler(response), payment.failed -> onError(error), dismiss -> onClose().
 * UPI app intents (upi://, intent://, tez://, phonepe:// ...) are handed to the OS.
 */
const html = (options) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;background:transparent}</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body><script>
(function(){
  var post=function(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));};
  try{
    var opts=${JSON.stringify(options).replace(/</g, '\\u003c')};
    opts.handler=function(r){post({type:'success',response:r});};
    opts.modal={ondismiss:function(){post({type:'dismiss'});},escape:true,animation:true,handleback:true};
    var rzp=new Razorpay(opts);
    rzp.on('payment.failed',function(r){post({type:'failed',error:r&&r.error});});
    rzp.open();
  }catch(e){post({type:'failed',error:{description:String(e&&e.message||e)}});}
})();
</script></body></html>`;

export default function DriverRazorpayCheckout({ request, onDone }) {
  const insets = useSafeAreaInsets();

  const finish = (msg) => {
    const r = request;
    onDone?.();
    if (!r) return;
    if (msg.type === 'success') r.handler?.(msg.response);
    else if (msg.type === 'failed') r.onError?.({ error: msg.error || { description: 'Payment failed' } });
    else r.onClose?.();
  };

  return (
    <Modal visible={Boolean(request)} transparent animationType="fade" onRequestClose={() => finish({ type: 'dismiss' })} statusBarTranslucent>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        {request ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: html(request.checkout), baseUrl: 'https://checkout.razorpay.com' }}
            style={styles.web}
            containerStyle={styles.webBox}
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
  wrap: { flex: 1, backgroundColor: 'rgba(6,44,22,0.62)' },
  webBox: { flex: 1, borderTopLeftRadius: DT.radius.xl, borderTopRightRadius: DT.radius.xl, overflow: 'hidden', backgroundColor: 'transparent' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
