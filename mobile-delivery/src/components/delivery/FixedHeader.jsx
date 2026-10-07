import { ScreenHeader } from '../ds';

/*
 * Legacy name kept for any stray import. It used to be an absolutely
 * positioned bar plus a hard-coded content offset (FIXED_HEADER_CONTENT_TOP),
 * which overlapped content on phones with a tall status bar. It is now the
 * design-system ScreenHeader, in normal flow, so content needs no offset.
 * `uppercase` is accepted and ignored: titles are sentence case.
 */
export default function FixedHeader({ title, onBack, uppercase: _uppercase, ...rest }) {
  return <ScreenHeader title={title} onBack={onBack} {...rest} />;
}
