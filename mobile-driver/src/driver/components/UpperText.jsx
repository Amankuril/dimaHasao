import { Children, cloneElement, isValidElement } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

/*
 * Web CSS `uppercase` + `tracking-*` for the trip screens. On Android a Text with textTransform:'uppercase' and a
 * letterSpacing measures its width before the transform and clips the last letter inside a shrinking row, so the
 * string itself is upper-cased here and the style's textTransform is dropped. Drop-in for react-native's Text.
 */
const upper = (node) => Children.map(node, (child) => {
  if (typeof child === 'string') return child.toUpperCase();
  if (isValidElement(child) && child.props?.children !== undefined) {
    return cloneElement(child, undefined, upper(child.props.children));
  }
  return child;
});

export default function Text({ style, children, ...rest }) {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.textTransform !== 'uppercase') {
    return <RNText {...rest} style={style}>{children}</RNText>;
  }
  return <RNText {...rest} style={[style, { textTransform: 'none' }]}>{upper(children)}</RNText>;
}
