import { NextRequest, NextResponse } from "next/server"

const PUBLISH_API_URL =
  process.env.NEXT_PUBLIC_PUBLISH_URL ||
  "https://asia-northeast1-cooking-class-system.cloudfunctions.net/publishLesson"

export async function POST(request: NextRequest) {
  try {
    const { html, date } = await request.json()

    // バリデーション
    if (!html || !date) {
      return NextResponse.json(
        { error: "HTMLと日付が必要です" },
        { status: 400 }
      )
    }

    // 日付フォーマットの検証（YYYY-MM-DD）
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(date)) {
      return NextResponse.json(
        { error: "日付は YYYY-MM-DD 形式で指定してください" },
        { status: 400 }
      )
    }

    // Cloud Functions の publishLesson を呼び出し
    const response = await fetch(PUBLISH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html, date }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `公開エラー: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Publish API error:", error)
    return NextResponse.json(
      {
        error: "公開に失敗しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
