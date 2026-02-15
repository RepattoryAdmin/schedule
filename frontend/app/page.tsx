"use client"

import { useState } from "react"
import { LessonForm, type LessonFormData } from "@/components/lesson-form"
import { OutputSection } from "@/components/output-section"
import { useToast } from "@/hooks/use-toast"

// Cloud Functions API エンドポイント
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://generate-6mcknbzbpq-an.a.run.app"
const LINE_SEND_URL = process.env.NEXT_PUBLIC_LINE_SEND_URL || "https://linesend-6mcknbzbpq-an.a.run.app"

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSendingLine, setIsSendingLine] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<{
    htmlContent: string
    lineText: string
    emailSubject: string
    emailBody: string
  } | null>(null)
  const [publishedUrl, setPublishedUrl] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleGenerate = async (data: LessonFormData) => {
    setIsGenerating(true)
    setError(null)

    try {
      // 日時をフォーマット
      const dateObj = new Date(`${data.date}T${data.time}`)
      const dayNames = ["日", "月", "火", "水", "木", "金", "土"]
      const year = dateObj.getFullYear()
      const month = dateObj.getMonth() + 1
      const day = dateObj.getDate()
      const dayName = dayNames[dateObj.getDay()]
      const datetime = `${year}年${month}月${day}日(${dayName}) ${data.time}〜`

      // Cloud Functions API を呼び出し
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          menu: data.menu,
          datetime,
          duration: String(data.duration),
          price: String(data.price),
          instructor: data.instructor,
          reservaUrl: data.reservaUrlRealtime,
          reservaUrlArchive: data.reservaUrlArchive,
          type: "all",
        }),
      })

      if (!response.ok) {
        throw new Error(`API エラー: ${response.status}`)
      }

      const result = await response.json()

      setGeneratedContent({
        htmlContent: result.html || "",
        lineText: result.lineText || "",
        emailSubject: result.emailSubject || "",
        emailBody: result.emailBody || "",
      })
      setPublishedUrl(undefined)

      toast({
        title: "生成完了",
        description: "LP、LINE告知文、メール告知文を生成しました",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "生成に失敗しました"
      setError(errorMessage)
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!generatedContent?.htmlContent) return

    setIsPublishing(true)
    try {
      // TODO: Cloud Storage → Firebase Hosting への公開フローを実装
      // 今は仮のURLを返す
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const timestamp = Date.now()
      setPublishedUrl(`https://cooking-class-system.web.app/lessons/${timestamp}`)

      toast({
        title: "公開完了",
        description: "LPを公開しました",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "公開に失敗しました"
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSendLine = async () => {
    if (!generatedContent?.lineText) return

    setIsSendingLine(true)
    try {
      const response = await fetch(LINE_SEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: generatedContent.lineText,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `LINE送信エラー: ${response.status}`)
      }

      toast({
        title: "送信完了",
        description: "LINE告知を送信しました",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "LINE送信に失敗しました"
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSendingLine(false)
    }
  }

  const handleSendEmail = async () => {
    if (!generatedContent?.emailBody) return

    setIsSendingEmail(true)
    try {
      // TODO: Gmail API 連携を実装
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "送信完了",
        description: "メールを送信しました",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "メール送信に失敗しました"
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍳</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">レッスン告知作成</h1>
              <p className="text-sm text-muted-foreground">
                レッスン情報を入力して、LP・LINE・メールを自動生成
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <LessonForm onGenerate={handleGenerate} isGenerating={isGenerating} />
          </div>

          <div>
            {generatedContent ? (
              <OutputSection
                htmlContent={generatedContent.htmlContent}
                lineText={generatedContent.lineText}
                emailSubject={generatedContent.emailSubject}
                emailBody={generatedContent.emailBody}
                publishedUrl={publishedUrl}
                onPublish={handlePublish}
                onSendLine={handleSendLine}
                onSendEmail={handleSendEmail}
                isPublishing={isPublishing}
                isSendingLine={isSendingLine}
                isSendingEmail={isSendingEmail}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-12 rounded-2xl border-2 border-dashed border-muted">
                  <span className="text-6xl mb-4 block">✨</span>
                  <p className="text-lg text-muted-foreground">
                    レッスン情報を入力して
                    <br />
                    <span className="font-medium text-foreground">「生成する」</span>
                    ボタンを押してください
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
