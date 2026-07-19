export function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  }
  if (t < 2 / d1) {
    const shifted = t - 1.5 / d1;
    return n1 * shifted * shifted + 0.75;
  }
  if (t < 2.5 / d1) {
    const shifted = t - 2.25 / d1;
    return n1 * shifted * shifted + 0.9375;
  }

  const shifted = t - 2.625 / d1;
  return n1 * shifted * shifted + 0.984375;
}

export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeOutQuint(t) {
  return 1 - (1 - t) ** 5;
}

export function animationScale(anim, now) {
  if (now < anim.startTime) {
    return 0;
  }
  const t = Math.min(1, (now - anim.startTime) / anim.duration);
  return easeOutBounce(t);
}
