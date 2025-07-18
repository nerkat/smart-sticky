// app/root.jsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import '@shopify/polaris/build/esm/styles.css';

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <html suppressHydrationWarning>
      <head>
        <title>Oops!</title>
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <h1>Something went wrong</h1>
        <pre>{isRouteErrorResponse(error) ? error.statusText : String(error)}</pre>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
