// supabase/functions/send_admin_email_notification/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@3.2.0'; 

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { to, subject, htmlBody, textBody } = await req.json();

    if (!to || !subject || (!htmlBody && !textBody)) {
      return new Response(JSON.stringify({ error: 'Missing required email fields (to, subject, htmlBody/textBody)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables.');
    }

    const resend = new Resend(RESEND_API_KEY);

    // Call resend.emails.send and assign the *full* response object
    const resendResult = await resend.emails.send({
      from: 'TavaroApp <info@sardexkataberna.com>', // *** Corrected typo: comma to dot in domain ***
      to: to,
      subject: subject,
      html: htmlBody || undefined,
      text: textBody || undefined,
    });

    // *** Implement robust type checking: first check for error ***
    if (resendResult.error) { // TypeScript should now recognize .error here for 3.2.0
      console.error('Resend email error:', resendResult.error);
      // Ensure you return a Response object with message
      return new Response(JSON.stringify({ error: resendResult.error.message || 'Unknown Resend error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // If there's no error, then 'data' should be present
    const data = resendResult.data; // TypeScript should now recognize .data here

    return new Response(JSON.stringify({ message: 'Email sent successfully!', data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    const errorMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message?: string }).message
        : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
