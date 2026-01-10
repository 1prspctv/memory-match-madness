import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook endpoint for Base mini app notifications
 * Must respond within 10 seconds to avoid timeout
 *
 * @see https://docs.base.org/mini-apps/core-concepts/notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log webhook payload for debugging
    console.log('[Webhook] Received notification:', body);

    // Respond immediately to avoid timeout
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    }, { status: 200 });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook'
    }, { status: 500 });
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is ready'
  }, { status: 200 });
}
