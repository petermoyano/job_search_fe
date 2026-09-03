type SearchSpinnerProps = {
  className?: string;
};

export function SearchSpinner({
  className = "h-6 w-6 text-teal-700",
}: SearchSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={"relative inline-flex shrink-0 " + className}
    >
      <svg
        className="h-full w-full motion-safe:animate-[spin_1.15s_linear_infinite]"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 3a9 9 0 1 0 9 9"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
        <path
          d="m18.5 18.5 2.5 2.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none">
        ⌕
      </span>
    </span>
  );
}
