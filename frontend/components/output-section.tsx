"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Check, Copy, ExternalLink, Globe, Mail, MessageCircle, Send } from "lucide-react"

interface OutputSectionProps {
  htmlContent: string
  lineText: string
  emailSubject: string
  emailBody: string
  publishedUrl?: string
  onPublish: () => void
  onSendLine: () => void
  onSendEmail: () => void
  isPublishing: boolean
  isSendingLine: boolean
  isSendingEmail: boolean
}

export function OutputSection({
  htmlContent,
  lineText,
  emailSubject,
  emailBody,
  publishedUrl,
  onPublish,
  onSendLine,
  onSendEmail,
  isPublishing,
  isSendingLine,
  isSendingEmail,
}: OutputSectionProps) {
  const [copiedLine, setCopiedLine] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const copyToClipboard = async (text: string, type: "line" | "email") => {
    await navigator.clipboard.writeText(text)
    if (type === "line") {
      setCopiedLine(true)
      setTimeout(() => setCopiedLine(false), 2000)
    } else {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl text-foreground">
          <span className="text-2xl">📝</span>
          生成結果
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="html" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="html" className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">HTML</span>
            </TabsTrigger>
            <TabsTrigger value="line" className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">LINE</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">メール</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="space-y-4">
            <div className="border rounded-xl overflow-hidden bg-white">
              <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">プレビュー</span>
              </div>
              <div className="p-4 min-h-[300px] max-h-[500px] overflow-auto w-full">
                <div className="w-full max-w-full" dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onPublish}
                disabled={isPublishing}
                className="flex-1"
              >
                {isPublishing ? (
                  <>
                    <span className="animate-spin mr-2">🌀</span>
                    公開中...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    公開する
                  </>
                )}
              </Button>
            </div>

            {publishedUrl && (
              <div className="flex items-center gap-2 p-3 bg-accent/20 rounded-lg">
                <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent">
                  公開済
                </Badge>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate"
                >
                  {publishedUrl}
                </a>
              </div>
            )}
          </TabsContent>

          <TabsContent value="line" className="space-y-4">
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-[#06C755]/10 px-4 py-2 border-b flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#06C755]" />
                <span className="text-sm font-medium text-[#06C755]">LINE告知文</span>
              </div>
              <div className="p-4 min-h-[200px] max-h-[400px] overflow-auto bg-white">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                  {lineText}
                </pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(lineText, "line")}
                className="flex-1"
              >
                {copiedLine ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-accent" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    コピー
                  </>
                )}
              </Button>
              <Button
                onClick={onSendLine}
                disabled={isSendingLine}
                className="flex-1 bg-[#06C755] hover:bg-[#05b04c] text-white"
              >
                {isSendingLine ? (
                  <>
                    <span className="animate-spin mr-2">🌀</span>
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    送信する
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 border-b flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">メール告知文</span>
              </div>
              <div className="p-4 min-h-[200px] max-h-[400px] overflow-auto bg-white">
                <div className="mb-3 pb-3 border-b">
                  <span className="text-xs text-muted-foreground">件名:</span>
                  <p className="font-medium text-foreground">{emailSubject}</p>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                  {emailBody}
                </pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(`件名: ${emailSubject}\n\n${emailBody}`, "email")}
                className="flex-1"
              >
                {copiedEmail ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-accent" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    コピー
                  </>
                )}
              </Button>
              <Button
                onClick={onSendEmail}
                disabled={isSendingEmail}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSendingEmail ? (
                  <>
                    <span className="animate-spin mr-2">🌀</span>
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    送信する
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
