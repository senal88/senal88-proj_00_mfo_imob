import React from 'react'
import { SituacaoOcupacao, SITUACAO_CONFIG } from '@/types/imob'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SituacaoBadgeProps {
  situacao: SituacaoOcupacao
  className?: string
  showDot?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const SituacaoBadge: React.FC<SituacaoBadgeProps> = ({
  situacao,
  className,
  showDot = true,
  size = 'md',
}) => {
  const config = SITUACAO_CONFIG[situacao] || SITUACAO_CONFIG.desocupado

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs font-semibold px-2.5 py-1 gap-2',
    lg: 'text-sm font-semibold px-3.5 py-1.5 gap-2.5',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors border shadow-xs',
        config.badgeClass,
        sizeClasses[size],
        className,
      )}
    >
      {showDot && (
        <span
          className={cn('inline-block rounded-full animate-pulse', config.dotClass, {
            'w-1.5 h-1.5': size === 'sm',
            'w-2 h-2': size === 'md',
            'w-2.5 h-2.5': size === 'lg',
          })}
        />
      )}
      <span>{config.label}</span>
    </Badge>
  )
}
