"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

interface SimpleDropdownItem {
  title: string
  description: string
}

interface NavigationItem {
  title: string
  href: string
}

interface SectionDropdownItem {
  section: string
  items: NavigationItem[]
}

type DropdownItem = SimpleDropdownItem | SectionDropdownItem

interface NavItem {
  title: string
  dropdownItems: DropdownItem[]
}

const NavItems: NavItem[] = [
  {
    title: "Products",
    dropdownItems: [
      { title: "Product 1", description: "Description for product 1" },
      { title: "Product 2", description: "Description for product 2" },
    ],
  },
  {
    title: "Solutions",
    dropdownItems: [
      {
        section: "What We Do",
        items: [
          { title: "Set Up Your Skills Strategy", href: "/skills-strategy" },
          { title: "Showcase Your Tech Brand", href: "/tech-brand" },
          { title: "Optimize Your Hiring Process", href: "/hiring-process" },
          { title: "Mobilize Your Internal Talent", href: "/internal-talent" },
        ],
      },
      {
        section: "Use Cases",
        items: [
          { title: "Remote Hiring", href: "/remote-hiring" },
          { title: "University Hiring", href: "/university-hiring" },
        ],
      },
    ],
  },
  {
    title: "Resources",
    dropdownItems: [],
  },
  {
    title: "Pricing",
    dropdownItems: [],
  },
  {
    title: "For Developers",
    dropdownItems: [],
  },
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? "bg-white/80 backdrop-blur-md border-b border-gray-200" : ""
    }`}>
      <div className="max-w-[1300px] mx-auto">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo */}
          <div className="flex-shrink-0 pr-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.svg?height=40&width=40"
                alt="Logo"
                width={40}
                height={40}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="/product">Product</NavLink>
            <NavLink href="/resources">Resources</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/customers">Customers</NavLink>
            <NavLink href="/blog">Blog</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm text-gray-600 hover:text-gray-900">
              Log in
            </Link>
            <Link 
              href="/signup"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

// NavLink component for consistent styling
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="text-sm text-gray-600 hover:text-blue-600 transition-colors font-inter"
    >
      {children}
    </Link>
  )
}
