import React from 'react';

type AvatarProps = {
  name: string;
  size?: number;
};

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
}

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 70%)`;
}

export function Avatar({ name, size = 40 }: AvatarProps) {
  const background = colorFromName(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 13,
        border: '1px solid #e6d2be',
        background
      }}
    >
      {initials(name)}
    </div>
  );
}
