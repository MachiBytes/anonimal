import { NextRequest, NextResponse } from 'next/server';
import { MessageService } from '@/lib/message-service';
import { validateSession } from '@/lib/auth-middleware';

const messageService = new MessageService();

// GET /api/channels/:id/messages - Get paginated message history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const anonUserId = searchParams.get('anonUserId');
    
    // Check if this is an authenticated owner request
    const session = await validateSession(request);
    
    if (session) {
      // Owner view - return all messages (pending and approved)
      const messages = await messageService.getMessagesForOwner(params.id);
      return NextResponse.json({ messages });
    }

    // Anonymous user view
    if (anonUserId) {
      // Return approved messages + user's own pending messages
      const messages = await messageService.getMessagesForAnonymousUser(params.id, anonUserId);
      return NextResponse.json({ messages });
    }

    // No authentication and no anonUserId - return initial history (approved only)
    if (cursor) {
      const result = await messageService.getPaginatedHistory(params.id, cursor);
      return NextResponse.json(result);
    }

    const messages = await messageService.getInitialHistory(params.id);
    return NextResponse.json({ 
      messages, 
      hasMore: messages.length === 15, 
      cursor: messages.length > 0 ? messages[0].approved_at?.toISOString() || null : null 
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
