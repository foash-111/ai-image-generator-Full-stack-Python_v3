import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-primary">AI</span> Image Generator
          </div>
          <nav className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="container grid items-center gap-6 py-12 md:py-24 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Transform your ideas into stunning images
            </h1>
            <p className="text-muted-foreground md:text-xl">
              Create beautiful, unique images from text descriptions using our advanced AI image generator.
            </p>
            <div className="flex gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Login
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
              <img
                src="/people-leave.png?height=512&width=512"
                alt="AI generated image example"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">"people leave the city at sunset scene"</p>
              <Link href="/login">
              <Button variant="outline" size="sm">
                Try it
              </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AI Image Generator. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
