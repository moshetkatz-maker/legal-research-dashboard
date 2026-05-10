import './globals.css'

export const metadata = {
  title: 'Legal Research Dashboard',
  description: 'AI-powered legal research with Bluebook formatting',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
