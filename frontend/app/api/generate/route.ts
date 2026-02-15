import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

const GENERATE_FUNCTION_URL = 'https://generate-1001487272172.asia-northeast1.run.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Google Application Default Credentials (ADC) を使用して認証
    const auth = new GoogleAuth()
    const client = await auth.getIdTokenClient(GENERATE_FUNCTION_URL)

    // 認証トークン付きでCloud Functionsを呼び出し
    const response = await client.request({
      url: GENERATE_FUNCTION_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error calling generate function:', error)
    return NextResponse.json(
      { error: '生成に失敗しました' },
      { status: 500 }
    )
  }
}
