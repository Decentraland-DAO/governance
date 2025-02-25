import React from 'react'

interface Props {
  size?: number
}

function Hiring({ size = 48 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle opacity="0.16" cx="24" cy="24" r="24" fill="#00B68A" />
      <path
        d="M20.5625 15.4062V17.125H27.4375V15.4062C27.4375 15.2172 27.2828 15.0625 27.0938 15.0625H20.9062C20.7172 15.0625 20.5625 15.2172 20.5625 15.4062ZM18.5 17.125V15.4062C18.5 14.0785 19.5785 13 20.9062 13H27.0938C28.4215 13 29.5 14.0785 29.5 15.4062V17.125V18.5V33.625H18.5V18.5V17.125ZM15.75 17.125H17.125V33.625H15.75C14.2332 33.625 13 32.3918 13 30.875V19.875C13 18.3582 14.2332 17.125 15.75 17.125ZM32.25 33.625H30.875V17.125H32.25C33.7668 17.125 35 18.3582 35 19.875V30.875C35 32.3918 33.7668 33.625 32.25 33.625Z"
        fill="#00B68A"
      />
    </svg>
  )
}

export default Hiring
