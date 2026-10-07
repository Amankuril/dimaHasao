import { ScreenHeader } from '../ds';

/*
 * Legacy name kept for any caller outside the pocket screens. The pocket
 * screens use ScreenHeader directly; this is a thin wrapper around it.
 * `size` and `leadingNone` are accepted and ignored (the design system
 * sets one header title size).
 */
export default function PlainHeader({ title, onBack, size, leadingNone, ...rest }) {
  return <ScreenHeader title={title} onBack={onBack} {...rest} />;
}
