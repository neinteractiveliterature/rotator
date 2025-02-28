import { createCookieSessionStorage } from "react-router";

type SessionData = {
  userId: number;
  accessToken: string;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",

      httpOnly: true,
      // maxAge: 60,
      path: "/",
      sameSite: "lax",
      secrets: [process.env.SECRET_KEY_BASE!],
      secure: true,
    },
  });

export { getSession, commitSession, destroySession };
