import React from 'react'

function OpenFolder({
  className,
  size = 24,
  color = 'var(--black-800)',
}: {
  className?: string
  color?: string
  size?: number
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
      <path
        fill={color}
        d="M6.1 10L4 18V8h17a2 2 0 00-2-2h-7l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h15c.9 0 1.7-.6 1.9-1.5l2.3-8.5H6.1M19 18H6l1.6-6h13L19 18z"
      ></path>
    </svg>
  )
}

export default OpenFolder
