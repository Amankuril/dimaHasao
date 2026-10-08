/*
 * CSS for admin-written HTML. The web wraps it in Tailwind Typography
 * `prose` classes, but @tailwindcss/typography is not installed, so those
 * classes are no-ops and the HTML renders with Tailwind's preflight reset
 * only: no margins, no list bullets, headings at inherited size and weight.
 * Under the delivery theme, h1-h4 also get Sora with .01em tracking.
 */
export function htmlCss({ font = 'poppins', soraHeadings = true, color = '#1F1F24', fontSize = 16, lineHeight = 24 } = {}) {
  const family = font === 'nunito' ? "'Nunito Sans', 'Outfit', sans-serif" : "'Poppins', system-ui, Avenir, Helvetica, Arial, sans-serif";
  return `
*,::before,::after{box-sizing:border-box;margin:0;padding:0;border:0 solid}
html,body{background:transparent;-webkit-text-size-adjust:100%}
body{font-family:${family};font-size:${fontSize}px;line-height:${lineHeight}px;color:${color};font-weight:400;-webkit-font-smoothing:antialiased;word-wrap:break-word}
h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}
ol,ul,menu{list-style:none}
a{color:inherit;text-decoration:inherit}
b,strong{font-weight:bolder}
img,video{max-width:100%;height:auto;display:block}
table{border-collapse:collapse}
${soraHeadings ? "h1,h2,h3,h4{font-family:'Sora','Nunito Sans',sans-serif;letter-spacing:.01em}" : ''}`;
}

export const FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Nunito+Sans:wght@500;600;700;800&family=Sora:wght@600;700&display=swap" rel="stylesheet">';
