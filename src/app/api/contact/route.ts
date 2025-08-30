import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Resend API Key aus Umgebungsvariablen
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    // Spam protection
    if (name.length < 2 || message.length < 10) {
      return NextResponse.json(
        { error: 'Name zu kurz oder Nachricht zu kurz' },
        { status: 400 }
      )
    }

    // Send email with Resend
    const emailResult = await resend.emails.send({
      from: 'Free4 App <noreply@free4.app>',
      to: ['support@free4.app'],
      replyTo: email,
      subject: `Kontaktanfrage von ${name} - Free4 App`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Kontaktanfrage - Free4 App</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
                    📧 Neue Kontaktanfrage - Free4 App
                </h2>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e40af;">Absender-Informationen:</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>E-Mail:</strong> ${email}</p>
                    <p><strong>Datum:</strong> ${new Date().toLocaleString('de-DE')}</p>
                </div>
                
                <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #1e40af;">Nachricht:</h3>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${message}</div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #1e40af;">
                        💡 <strong>Antworten Sie direkt auf diese E-Mail</strong> um dem Nutzer zu antworten.
                    </p>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
                
                <p style="text-align: center; color: #64748b; font-size: 12px;">
                    Diese E-Mail wurde automatisch über das Kontaktformular der Free4 App generiert.<br>
                    Free4 App - Spontane Treffen mit Freunden
                </p>
            </div>
        </body>
        </html>
      `,
    })

    if (emailResult.error) {
      console.error('Resend error:', emailResult.error)
      return NextResponse.json(
        { error: 'E-Mail konnte nicht gesendet werden' },
        { status: 500 }
      )
    }

    console.log('Contact form email sent:', emailResult.data?.id)

    return NextResponse.json(
      { 
        message: 'Nachricht erfolgreich gesendet',
        emailId: emailResult.data?.id 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}