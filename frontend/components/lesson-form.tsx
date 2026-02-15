"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export interface LessonFormData {
  menu: string
  date: string
  time: string
  duration: number
  price: number
  instructor: string
  reservaUrlRealtime: string
  reservaUrlArchive: string
}

interface LessonFormProps {
  onGenerate: (data: LessonFormData) => void
  isGenerating: boolean
}

export function LessonForm({ onGenerate, isGenerating }: LessonFormProps) {
  const [formData, setFormData] = useState<LessonFormData>({
    menu: "",
    date: "",
    time: "10:00",
    duration: 120,
    price: 2090,
    instructor: "",
    reservaUrlRealtime: "",
    reservaUrlArchive: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate(formData)
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-foreground">
          <span className="text-2xl">🍳</span>
          レッスン情報を入力
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="menu" className="text-foreground font-medium">
              お品書き
            </Label>
            <Textarea
              id="menu"
              placeholder={`🍴お品書き🍴\n🥔 1. ほっくり重ね煮の旨み...\n🐟 2. ふっくらサワラのごま煮...`}
              value={formData.menu}
              onChange={(e) => setFormData({ ...formData, menu: e.target.value })}
              className="min-h-[160px] resize-none bg-background"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-foreground font-medium">
                日付
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-background"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-foreground font-medium">
                開始時間
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="bg-background"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-foreground font-medium">
                時間（分）
              </Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="bg-background"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-foreground font-medium">
                料金（税込）
              </Label>
              <div className="relative">
                <Input
                  id="price"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="bg-background pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  円
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor" className="text-foreground font-medium">
              講師名
            </Label>
            <Input
              id="instructor"
              placeholder="山田花子"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              className="bg-background"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservaUrlRealtime" className="text-foreground font-medium">
              レゼルバURL（リアルタイム予約）
            </Label>
            <Input
              id="reservaUrlRealtime"
              type="url"
              placeholder="https://reserva.be/xxx/reserve?..."
              value={formData.reservaUrlRealtime}
              onChange={(e) => setFormData({ ...formData, reservaUrlRealtime: e.target.value })}
              className="bg-background"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservaUrlArchive" className="text-foreground font-medium">
              レゼルバURL（アーカイブ予約）
            </Label>
            <Input
              id="reservaUrlArchive"
              type="url"
              placeholder="https://reserva.be/xxx/reserve?..."
              value={formData.reservaUrlArchive}
              onChange={(e) => setFormData({ ...formData, reservaUrlArchive: e.target.value })}
              className="bg-background"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full text-lg py-6 font-medium"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">✨</span>
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                生成する
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
