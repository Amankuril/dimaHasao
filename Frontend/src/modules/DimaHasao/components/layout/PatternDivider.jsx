export const PatternDivider = ({ variant = 'native', className = '' }) => {
  if (variant === 'geometric') {
    return (
      <div className={`h-1.5 w-full pattern-border ${className}`} />
    );
  }

  if (variant === 'green-gold') {
    return (
      <div
        className={`h-3 w-full bg-contain bg-repeat-x opacity-90 ${className}`}
        style={{
          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuATHjeesOsLPQY1ZJsuj1f6xM4T98ifEgybjedMBXnOl5eF9KNavfsCQJnQPrBr9IC3Nw7BUI_kpFCE1MQ_kTv-GsAh72ZTeAtpQ1CWQNNPFbx21vq8fy3cd46J3q_-8GhThIgbqcBnLuIcuxRv7PTAxX0peGxpElyMrkAW1bkN9t2Xk9sHL4Nvm6MjRzb6uhejLnY--d6DDzHxq0gQMAKt9k7p730tgoS5RDOqfWMhU4kE686YXZB-')"
        }}
      />
    );
  }

  return (
    <div
      className={`h-3.5 w-full bg-cover bg-center bg-repeat-x ${className}`}
      style={{
        backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC8IzS0KGsZzD_ZsijD_Vb-LZQpKYgIWw4VohpFMmr933UP-N_Zhpooyqs6qZAdZtoClS1TrtsQyKiEtEwz02mvF9OVsLkZoYmTdDejXyjP3MPItv6cvhDIXboFC6uVubOjFoeXcjnSvL-TQrfbiS9x0SdHlqxY0gDn7Z_YF3u_PcOnSyWqCG7YdQpCPTj-IAkK4JzgzYfttLKrc63d9Lk4R3zd8Z8fi_3NQWZ1QjZ3i-lDnAYQpArL')"
      }}
    />
  );
};
