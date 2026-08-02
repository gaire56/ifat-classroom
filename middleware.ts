import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/teacher/") && path !== "/teacher/login") {
    if (!request.cookies.get("ifat_teacher_session")) {
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }
  }

  if (path.startsWith("/student/") && path !== "/student/login") {
    if (!request.cookies.get("ifat_group_session")) {
      return NextResponse.redirect(new URL("/student/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*"]
};
