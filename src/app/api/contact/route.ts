import { NextRequest, NextResponse } from 'next/server'

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

    // For now, we'll just log the message and return success
    // In production, you would integrate with an email service like:
    // - Nodemailer with SMTP
    // - SendGrid
    // - AWS SES
    // - etc.
    
    console.log('Contact form submission:', {
      name,
      email,
      message,
      timestamp: new Date().toISOString()
    })

    // TODO: Implement actual email sending to support@free4.app
    // Example with Nodemailer:
    /*
    const nodemailer = require('nodemailer')
    
    const transporter = nodemailer.createTransporter({
      // Configure your SMTP settings
      host: 'your-smtp-host',
      port: 587,
      secure: false,
      auth: {
        user: 'your-email@domain.com',
        pass: 'your-app-password'
      }
    })

    await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: 'support@free4.app',
      subject: `Kontaktanfrage von ${name}`,
      html: `
        <h3>Neue Kontaktanfrage</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>E-Mail:</strong> ${email}</p>
        <p><strong>Nachricht:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    })
    */

    return NextResponse.json(
      { message: 'Nachricht erfolgreich gesendet' },
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