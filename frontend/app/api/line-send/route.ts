import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

const LINE_SEND_FUNCTION_URL = 'https://linesend-1001487272172.asia-northeast1.run.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Google Application Default Credentials (ADC) を使用して認証
    const auth = new GoogleAuth()
    const client = await auth.getIdTokenClient(LINE_SEND_FUNCTION_URL)

    // 認証トークン付きでCloud Functionsを呼び出し
    const response = await client.request({
      url: LINE_SEND_FUNCTION_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error calling lineSend function:', error)
    return NextResponse.json(
      { error: 'LINE送信に失敗しました' },
      { status: 500 }
    )
  }
}
