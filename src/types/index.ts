import { Role } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface User {
    role?: Role
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: Role
  }
}
