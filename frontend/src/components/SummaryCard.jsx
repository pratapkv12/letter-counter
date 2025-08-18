import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function SummaryCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  className 
}) {
  const isPositiveTrend = trend && trend.type === 'positive'
  const isNegativeTrend = trend && trend.type === 'negative'

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center text-xs mt-2",
            isPositiveTrend && "text-green-600",
            isNegativeTrend && "text-red-600",
            !isPositiveTrend && !isNegativeTrend && "text-muted-foreground"
          )}>
            <span className={cn(
              "inline-flex items-center",
              isPositiveTrend && "text-green-600",
              isNegativeTrend && "text-red-600"
            )}>
              {isPositiveTrend && "↗"}
              {isNegativeTrend && "↘"}
              {!isPositiveTrend && !isNegativeTrend && "→"}
              <span className="ml-1">{trend.value}</span>
            </span>
            <span className="ml-1 text-muted-foreground">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}