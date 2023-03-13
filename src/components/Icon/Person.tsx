import React from 'react'

function Person({
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
        d="M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"
      ></path>
    </svg>
  )
}

export default Person
