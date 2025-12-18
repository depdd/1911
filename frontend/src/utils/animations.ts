// 动画工具函数 - 使用CSS过渡和原生JavaScript实现

// 初始化页面动画
export const initializeAnimations = () => {
  // 页面加载动画
  const fadeElements = document.querySelectorAll('.fade-in')
  fadeElements.forEach((element, index) => {
    const el = element as HTMLElement
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out'
    setTimeout(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, index * 100)
  })

  // 卡片悬停动画
  const cards = document.querySelectorAll('.hover-card')
  cards.forEach(card => {
    const el = card as HTMLElement
    el.style.transition = 'transform 0.3s ease-out'
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'translateY(-8px) scale(1.02)'
    })

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translateY(0) scale(1)'
    })
  })
}

// 数字计数动画
export const animateCounter = (
  element: HTMLElement,
  from: number,
  to: number,
  duration: number = 1000
) => {
  const startTime = performance.now()
  
  const updateValue = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = easeOutQuart(progress)
    const currentValue = Math.round(from + (to - from) * easeProgress)
    
    element.textContent = currentValue.toString()
    
    if (progress < 1) {
      requestAnimationFrame(updateValue)
    }
  }
  
  requestAnimationFrame(updateValue)
}

// 进度条动画
export const animateProgress = (
  element: HTMLElement,
  progress: number,
  duration: number = 800
) => {
  element.style.transition = `width ${duration}ms ease-out`
  element.style.width = `${progress}%`
}

// 脉冲动画
export const pulseAnimation = (element: HTMLElement, scale: number = 1.05) => {
  element.style.transition = 'transform 1s ease-in-out'
  
  const animate = () => {
    element.style.transform = `scale(${scale})`
    setTimeout(() => {
      element.style.transform = 'scale(1)'
      setTimeout(animate, 1000)
    }, 1000)
  }
  
  animate()
}

// 发光动画
export const glowAnimation = (element: HTMLElement) => {
  element.style.transition = 'box-shadow 2s ease-in-out'
  
  const animate = () => {
    element.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.5)'
    setTimeout(() => {
      element.style.boxShadow = '0 0 0 rgba(0, 212, 255, 0)'
      setTimeout(animate, 2000)
    }, 2000)
  }
  
  animate()
}

// 打字机效果
export const typewriterEffect = (
  element: HTMLElement,
  text: string,
  speed: number = 50
) => {
  element.textContent = ''
  let index = 0

  const timer = setInterval(() => {
    if (index < text.length) {
      element.textContent += text.charAt(index)
      index++
    } else {
      clearInterval(timer)
    }
  }, speed)

  return timer
}

// 滑动进入动画
export const slideInAnimation = (
  elements: NodeListOf<HTMLElement>,
  direction: 'left' | 'right' | 'up' | 'down' = 'up'
) => {
  // 改进transforms对象类型，确保每个方向都有明确的transform值
  let translateX = 0
  let translateY = 0
  
  switch (direction) {
    case 'left':
      translateX = -50
      break
    case 'right':
      translateX = 50
      break
    case 'up':
      translateY = 30
      break
    case 'down':
      translateY = -30
      break
  }

  elements.forEach((element, index) => {
    element.style.opacity = '0'
    element.style.transform = `translate(${translateX}px, ${translateY}px)`
    element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out'
    
    setTimeout(() => {
      element.style.opacity = '1'
      element.style.transform = 'translate(0, 0)'
    }, index * 100)
  })
}

// 交错淡入动画
export const staggerFadeIn = (
  elements: NodeListOf<HTMLElement>,
  delay: number = 100
) => {
  elements.forEach((element, index) => {
    element.style.opacity = '0'
    element.style.transform = 'translateY(20px)'
    element.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out'
    
    setTimeout(() => {
      element.style.opacity = '1'
      element.style.transform = 'translateY(0)'
    }, index * delay)
  })
}

// 旋转加载动画
export const spinAnimation = (element: HTMLElement) => {
  element.style.transition = 'transform 1s linear'
  
  const rotate = () => {
    const currentRotation = element.style.transform
    const newRotation = currentRotation ? 
      `rotate(${parseInt(currentRotation.replace('rotate(', '').replace('deg)', '')) + 360}deg)` : 
      'rotate(360deg)'
    element.style.transform = newRotation
    requestAnimationFrame(() => setTimeout(rotate, 1000))
  }
  
  rotate()
}

// 心跳动画
export const heartbeatAnimation = (element: HTMLElement) => {
  element.style.transition = 'transform 0.3s ease-in-out'
  
  const beat = () => {
    element.style.transform = 'scale(1.2)'
    setTimeout(() => {
      element.style.transform = 'scale(0.9)'
      setTimeout(() => {
        element.style.transform = 'scale(1.2)'
        setTimeout(() => {
          element.style.transform = 'scale(1)'
          setTimeout(beat, 1000)
        }, 100)
      }, 100)
    }, 100)
  }
  
  beat()
}

// 颜色循环动画
export const colorCycleAnimation = (
  element: HTMLElement,
  colors: string[]
) => {
  let index = 0
  element.style.transition = 'color 1s ease-in-out, background-color 1s ease-in-out'
  
  const cycle = () => {
    element.style.color = colors[index]
    index = (index + 1) % colors.length
    setTimeout(cycle, 1000)
  }
  
  cycle()
}

// 波浪动画
export const waveAnimation = (
  elements: NodeListOf<HTMLElement>,
  amplitude: number = 20
) => {
  elements.forEach((element, index) => {
    element.style.transition = 'transform 0.5s ease-in-out'
    
    const wave = () => {
      element.style.transform = `translateY(-${amplitude}px)`
      setTimeout(() => {
        element.style.transform = 'translateY(0)'
        setTimeout(wave, 1000)
      }, 500)
    }
    
    setTimeout(wave, index * 100)
  })
}

// 爆炸动画 (简化版)
export const explodeAnimation = (
  element: HTMLElement
) => {
  element.style.opacity = '0'
  element.style.transform = 'scale(0)'
  element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
}

// 自定义缓动函数
export const customEasing = {
  elastic: (t: number) => {
    return t === 0 || t === 1 ? t : 
      -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))
  },
  
  bounce: (t: number) => {
    const n1 = 7.5625
    const d1 = 2.75
    
    if (t < 1 / d1) {
      return n1 * t * t
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375
    }
  },
  
  spring: (t: number) => {
    return 1 - Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6)
  }
}

// 缓动函数
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}