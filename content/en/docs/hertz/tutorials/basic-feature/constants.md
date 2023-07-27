---
title: "Constants"
date: 2023-05-24
weight: 17
description: >
---

Hertz defines a set of constants for users to use, which are located in the [github.com/cloudwego/hertz/pkg/protocol/consts](https://github.com/cloudwego/hertz/tree/develop/pkg/protocol/consts).

### HTTP method

```go
// HTTP methods were copied from net/http.
const (
	MethodGet     = "GET"     // RFC 7231, 4.3.1
	MethodHead    = "HEAD"    // RFC 7231, 4.3.2
	MethodPost    = "POST"    // RFC 7231, 4.3.3
	MethodPut     = "PUT"     // RFC 7231, 4.3.4
	MethodPatch   = "PATCH"   // RFC 5789
	MethodDelete  = "DELETE"  // RFC 7231, 4.3.5
	MethodConnect = "CONNECT" // RFC 7231, 4.3.6
	MethodOptions = "OPTIONS" // RFC 7231, 4.3.7
	MethodTrace   = "TRACE"   // RFC 7231, 4.3.8
)
```

### HTTP MIME type

```go
const (	
	// MIME text
	MIMETextPlain             = "text/plain"
	MIMETextPlainUTF8         = "text/plain; charset=utf-8"
	MIMETextPlainISO88591     = "text/plain; charset=iso-8859-1"
	MIMETextPlainFormatFlowed = "text/plain; format=flowed"
	MIMETextPlainDelSpaceYes  = "text/plain; delsp=yes"
	MiMETextPlainDelSpaceNo   = "text/plain; delsp=no"
	MIMETextHtml              = "text/html"
	MIMETextCss               = "text/css"
	MIMETextJavascript        = "text/javascript"
	// MIME application
	MIMEApplicationOctetStream  = "application/octet-stream"
	MIMEApplicationFlash        = "application/x-shockwave-flash"
	MIMEApplicationHTMLForm     = "application/x-www-form-urlencoded"
	MIMEApplicationHTMLFormUTF8 = "application/x-www-form-urlencoded; charset=UTF-8"
	MIMEApplicationTar          = "application/x-tar"
	MIMEApplicationGZip         = "application/gzip"
	MIMEApplicationXGZip        = "application/x-gzip"
	MIMEApplicationBZip2        = "application/bzip2"
	MIMEApplicationXBZip2       = "application/x-bzip2"
	MIMEApplicationShell        = "application/x-sh"
	MIMEApplicationDownload     = "application/x-msdownload"
	MIMEApplicationJSON         = "application/json"
	MIMEApplicationJSONUTF8     = "application/json; charset=utf-8"
	MIMEApplicationXML          = "application/xml"
	MIMEApplicationXMLUTF8      = "application/xml; charset=utf-8"
	MIMEApplicationZip          = "application/zip"
	MIMEApplicationPdf          = "application/pdf"
	MIMEApplicationWord         = "application/msword"
	MIMEApplicationExcel        = "application/vnd.ms-excel"
	MIMEApplicationPPT          = "application/vnd.ms-powerpoint"
	MIMEApplicationOpenXMLWord  = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	MIMEApplicationOpenXMLExcel = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	MIMEApplicationOpenXMLPPT   = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	// MIME image
	MIMEImageJPEG         = "image/jpeg"
	MIMEImagePNG          = "image/png"
	MIMEImageGIF          = "image/gif"
	MIMEImageBitmap       = "image/bmp"
	MIMEImageWebP         = "image/webp"
	MIMEImageIco          = "image/x-icon"
	MIMEImageMicrosoftICO = "image/vnd.microsoft.icon"
	MIMEImageTIFF         = "image/tiff"
	MIMEImageSVG          = "image/svg+xml"
	MIMEImagePhotoshop    = "image/vnd.adobe.photoshop"
	// MIME audio
	MIMEAudioBasic     = "audio/basic"
	MIMEAudioL24       = "audio/L24"
	MIMEAudioMP3       = "audio/mp3"
	MIMEAudioMP4       = "audio/mp4"
	MIMEAudioMPEG      = "audio/mpeg"
	MIMEAudioOggVorbis = "audio/ogg"
	MIMEAudioWAVE      = "audio/vnd.wave"
	MIMEAudioWebM      = "audio/webm"
	MIMEAudioAAC       = "audio/x-aac"
	MIMEAudioAIFF      = "audio/x-aiff"
	MIMEAudioMIDI      = "audio/x-midi"
	MIMEAudioM3U       = "audio/x-mpegurl"
	MIMEAudioRealAudio = "audio/x-pn-realaudio"
	// MIME video
	MIMEVideoMPEG          = "video/mpeg"
	MIMEVideoOgg           = "video/ogg"
	MIMEVideoMP4           = "video/mp4"
	MIMEVideoQuickTime     = "video/quicktime"
	MIMEVideoWinMediaVideo = "video/x-ms-wmv"
	MIMEVideWebM           = "video/webm"
	MIMEVideoFlashVideo    = "video/x-flv"
	MIMEVideo3GPP          = "video/3gpp"
	MIMEVideoAVI           = "video/x-msvideo"
	MIMEVideoMatroska      = "video/x-matroska"
)
```

### HTTP status code

```go
// HTTP status codes were stolen from net/http.
const (
   StatusContinue           = 100 // RFC 7231, 6.2.1
   StatusSwitchingProtocols = 101 // RFC 7231, 6.2.2
   StatusProcessing         = 102 // RFC 2518, 10.1
   StatusOK                   = 200 // RFC 7231, 6.3.1
   StatusCreated              = 201 // RFC 7231, 6.3.2
   StatusAccepted             = 202 // RFC 7231, 6.3.3
   StatusNonAuthoritativeInfo = 203 // RFC 7231, 6.3.4
   StatusNoContent            = 204 // RFC 7231, 6.3.5
   StatusResetContent         = 205 // RFC 7231, 6.3.6
   StatusPartialContent       = 206 // RFC 7233, 4.1
   StatusMultiStatus          = 207 // RFC 4918, 11.1
   StatusAlreadyReported      = 208 // RFC 5842, 7.1
   StatusIMUsed               = 226 // RFC 3229, 10.4.1
   StatusMultipleChoices   = 300 // RFC 7231, 6.4.1
   StatusMovedPermanently  = 301 // RFC 7231, 6.4.2
   StatusFound             = 302 // RFC 7231, 6.4.3
   StatusSeeOther          = 303 // RFC 7231, 6.4.4
   StatusNotModified       = 304 // RFC 7232, 4.1
   StatusUseProxy          = 305 // RFC 7231, 6.4.5
   _                       = 306 // RFC 7231, 6.4.6 (Unused)
   StatusTemporaryRedirect = 307 // RFC 7231, 6.4.7
   StatusPermanentRedirect = 308 // RFC 7538, 3
   StatusBadRequest                   = 400 // RFC 7231, 6.5.1
   StatusUnauthorized                 = 401 // RFC 7235, 3.1
   StatusPaymentRequired              = 402 // RFC 7231, 6.5.2
   StatusForbidden                    = 403 // RFC 7231, 6.5.3
   StatusNotFound                     = 404 // RFC 7231, 6.5.4
   StatusMethodNotAllowed             = 405 // RFC 7231, 6.5.5
   StatusNotAcceptable                = 406 // RFC 7231, 6.5.6
   StatusProxyAuthRequired            = 407 // RFC 7235, 3.2
   StatusRequestTimeout               = 408 // RFC 7231, 6.5.7
   StatusConflict                     = 409 // RFC 7231, 6.5.8
   StatusGone                         = 410 // RFC 7231, 6.5.9
   StatusLengthRequired               = 411 // RFC 7231, 6.5.10
   StatusPreconditionFailed           = 412 // RFC 7232, 4.2
   StatusRequestEntityTooLarge        = 413 // RFC 7231, 6.5.11
   StatusRequestURITooLong            = 414 // RFC 7231, 6.5.12
   StatusUnsupportedMediaType         = 415 // RFC 7231, 6.5.13
   StatusRequestedRangeNotSatisfiable = 416 // RFC 7233, 4.4
   StatusExpectationFailed            = 417 // RFC 7231, 6.5.14
   StatusTeapot                       = 418 // RFC 7168, 2.3.3
   StatusUnprocessableEntity          = 422 // RFC 4918, 11.2
   StatusLocked                       = 423 // RFC 4918, 11.3
   StatusFailedDependency             = 424 // RFC 4918, 11.4
   StatusUpgradeRequired              = 426 // RFC 7231, 6.5.15
   StatusPreconditionRequired         = 428 // RFC 6585, 3
   StatusTooManyRequests              = 429 // RFC 6585, 4
   StatusRequestHeaderFieldsTooLarge  = 431 // RFC 6585, 5
   StatusUnavailableForLegalReasons   = 451 // RFC 7725, 3
   StatusInternalServerError           = 500 // RFC 7231, 6.6.1
   StatusNotImplemented                = 501 // RFC 7231, 6.6.2
   StatusBadGateway                    = 502 // RFC 7231, 6.6.3
   StatusServiceUnavailable            = 503 // RFC 7231, 6.6.4
   StatusGatewayTimeout                = 504 // RFC 7231, 6.6.5
   StatusHTTPVersionNotSupported       = 505 // RFC 7231, 6.6.6
   StatusVariantAlsoNegotiates         = 506 // RFC 2295, 8.1
   StatusInsufficientStorage           = 507 // RFC 4918, 11.5
   StatusLoopDetected                  = 508 // RFC 5842, 7.2
   StatusNotExtended                   = 510 // RFC 2774, 7
   StatusNetworkAuthenticationRequired = 511 // RFC 6585, 6
)
```

### HTTP Header

```go
const (
   HeaderDate = "Date"
   HeaderIfModifiedSince = "If-Modified-Since"
   HeaderLastModified    = "Last-Modified"
   // Redirects
   HeaderLocation = "Location"
   // Transfer coding
   HeaderTE               = "TE"
   HeaderTrailer          = "Trailer"
   HeaderTrailerLower     = "trailer"
   HeaderTransferEncoding = "Transfer-Encoding"
   // Controls
   HeaderCookie         = "Cookie"
   HeaderExpect         = "Expect"
   HeaderMaxForwards    = "Max-Forwards"
   HeaderSetCookie      = "Set-Cookie"
   HeaderSetCookieLower = "set-cookie"
   // Connection management
   HeaderConnection      = "Connection"
   HeaderKeepAlive       = "Keep-Alive"
   HeaderProxyConnection = "Proxy-Connection"
   // Authentication
   HeaderAuthorization      = "Authorization"
   HeaderProxyAuthenticate  = "Proxy-Authenticate"
   HeaderProxyAuthorization = "Proxy-Authorization"
   HeaderWWWAuthenticate    = "WWW-Authenticate"
   // Range requests
   HeaderAcceptRanges = "Accept-Ranges"
   HeaderContentRange = "Content-Range"
   HeaderIfRange      = "If-Range"
   HeaderRange        = "Range"
   // Response context
   HeaderAllow       = "Allow"
   HeaderServer      = "Server"
   HeaderServerLower = "server"
   // Request context
   HeaderFrom           = "From"
   HeaderHost           = "Host"
   HeaderReferer        = "Referer"
   HeaderReferrerPolicy = "Referrer-Policy"
   HeaderUserAgent      = "User-Agent"
   // Message body information
   HeaderContentEncoding = "Content-Encoding"
   HeaderContentLanguage = "Content-Language"
   HeaderContentLength   = "Content-Length"
   HeaderContentLocation = "Content-Location"
   HeaderContentType     = "Content-Type"
   // Content negotiation
   HeaderAccept         = "Accept"
   HeaderAcceptCharset  = "Accept-Charset"
   HeaderAcceptEncoding = "Accept-Encoding"
   HeaderAcceptLanguage = "Accept-Language"
   HeaderAltSvc         = "Alt-Svc"
)
```

### HTTP protocol version

```go
const(
	// Protocol
	HTTP11 = "HTTP/1.1"
	HTTP10 = "HTTP/1.0"
	HTTP20 = "HTTP/2.0"
)
```
