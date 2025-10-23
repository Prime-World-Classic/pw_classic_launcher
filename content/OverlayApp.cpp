#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>

#pragma comment(lib, "ws2_32.lib")

using json = nlohmann::json;

#define WM_TOGGLE_CLICKABLE (WM_USER + 1)

HHOOK hHook = NULL;
HWND hWnd = NULL;

std::wstring Utf8ToWstring(const std::string& str) {
   int size_needed = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, NULL, 0);
   std::wstring wstr(size_needed, 0);
   MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &wstr[0], size_needed);
   return wstr;
}

std::string ExtractTextFromHtml(const std::string& html) {
   std::string result;

   size_t nameStart = html.find("<div class=\"voice-info-panel-body-item-name\">");
   if (nameStart != std::string::npos) {
      nameStart += 44;
      size_t nameEnd = html.find("</div>", nameStart);
      if (nameEnd != std::string::npos) {
         result += html.substr(nameStart, nameEnd - nameStart) + " ";
      }
   }

   size_t widthStart = html.find("style=\"width: ");
   if (widthStart != std::string::npos) {
      widthStart += 14;
      size_t widthEnd = html.find("%", widthStart);
      if (widthEnd != std::string::npos) {
         result += "Level: " + html.substr(widthStart, widthEnd - widthStart) + "%";
      }
   }

   return result.empty() ? "No data" : result;
}

struct PanelData {
   std::string html;
   int level = 0;
};

SOCKET clientSocket = INVALID_SOCKET;

void ConnectToServer() {
   WSADATA wsaData;
   WSAStartup(MAKEWORD(2, 2), &wsaData);
   clientSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
   if (clientSocket == INVALID_SOCKET) return;
   sockaddr_in serverAddr;
   serverAddr.sin_family = AF_INET;
   serverAddr.sin_port = htons(12345);
   inet_pton(AF_INET, "127.0.0.1", &serverAddr.sin_addr);
   connect(clientSocket, (sockaddr*)&serverAddr, sizeof(serverAddr));
   // ИСПРАВЛЕНО: Неблокирующий режим
   u_long mode = 1;
   ioctlsocket(clientSocket, FIONBIO, &mode);
}

PanelData ReceiveData() {
   PanelData data;
   char buffer[1024] = { 0 };
   int bytes = recv(clientSocket, buffer, sizeof(buffer) - 1, 0);
   if (bytes > 0) {
      buffer[bytes] = '\0';
      try {
         json j = json::parse(buffer);
         if (j.contains("html")) data.html = ExtractTextFromHtml(j["html"]);
         if (j.contains("level")) data.level = j["level"];
      }
      catch (const std::exception&) {
      }
   }
   else if (bytes == SOCKET_ERROR && WSAGetLastError() != WSAEWOULDBLOCK) {
      // Ошибка, игнорируем
   }
   return data;
}

void DrawPanel(HDC hdc, PanelData data) {
   RECT rect = { 0, 0, 200, 400 };
   FillRect(hdc, &rect, (HBRUSH)GetStockObject(WHITE_BRUSH));

   SetTextColor(hdc, RGB(0, 0, 0));
   std::wstring wideHtml = Utf8ToWstring(data.html);
   TextOutW(hdc, 10, 10, wideHtml.c_str(), static_cast<int>(wideHtml.length()));

   RECT barRect = { 10, 50, 190, 70 };
   FillRect(hdc, &barRect, (HBRUSH)GetStockObject(GRAY_BRUSH));
   RECT levelRect = { 10, 50, 10 + (data.level * 180 / 100), 70 };
   HBRUSH blueBrush = CreateSolidBrush(RGB(0, 150, 255));
   FillRect(hdc, &levelRect, blueBrush);
   DeleteObject(blueBrush);
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
   static bool ctrlPressed = false;
   static bool dragging = false;
   static POINT dragStart = { 0, 0 };
   switch (msg) {
   case WM_TOGGLE_CLICKABLE:
      ctrlPressed = !ctrlPressed;
      if (ctrlPressed) {
         LONG style = GetWindowLong(hwnd, GWL_EXSTYLE) & ~(WS_EX_LAYERED | WS_EX_TRANSPARENT);
         SetWindowLong(hwnd, GWL_EXSTYLE, style | WS_EX_LAYERED);
         SetWindowPos(hwnd, NULL, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
         SetLayeredWindowAttributes(hwnd, 0, 150, LWA_ALPHA);
         SetFocus(hwnd);
         RedrawWindow(hwnd, NULL, NULL, RDW_INVALIDATE | RDW_UPDATENOW);
      }
      else {
         dragging = false;
         LONG style = GetWindowLong(hwnd, GWL_EXSTYLE) | (WS_EX_LAYERED | WS_EX_TRANSPARENT);
         SetWindowLong(hwnd, GWL_EXSTYLE, style);
         SetWindowPos(hwnd, NULL, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
         SetLayeredWindowAttributes(hwnd, 0, 20, LWA_ALPHA);
         RedrawWindow(hwnd, NULL, NULL, RDW_INVALIDATE | RDW_UPDATENOW);
      }
      break;
   case WM_LBUTTONDOWN:
      if (ctrlPressed) {
         dragging = true;
         GetCursorPos(&dragStart);
         SetCapture(hwnd);
      }
      break;
   case WM_MOUSEMOVE:
      if (dragging && ctrlPressed) {
         POINT currentPos;
         GetCursorPos(&currentPos);
         int dx = currentPos.x - dragStart.x;
         int dy = currentPos.y - dragStart.y;
         if (dx != 0 || dy != 0) {
            RECT rect;
            GetWindowRect(hwnd, &rect);
            SetWindowPos(hwnd, NULL, rect.left + dx, rect.top + dy, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
            dragStart = currentPos;
         }
      }
      break;
   case WM_LBUTTONUP:
      if (dragging) {
         dragging = false;
         ReleaseCapture();
      }
      break;
   case WM_PAINT:
   {
      PAINTSTRUCT ps;
      HDC hdc = BeginPaint(hwnd, &ps);
      PanelData data = ReceiveData();
      DrawPanel(hdc, data);
      EndPaint(hwnd, &ps);
   }
   break;
   case WM_DESTROY:
      PostQuitMessage(0);
      break;
   default:
      return DefWindowProc(hwnd, msg, wParam, lParam);
   }
   return 0;
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
   ConnectToServer();

   WNDCLASSEX wc = { sizeof(WNDCLASSEX), CS_HREDRAW | CS_VREDRAW, WndProc, 0, 0, hInstance, NULL, NULL, NULL, NULL, TEXT("OverlayClass"), NULL };
   RegisterClassEx(&wc);

   HWND hwnd = CreateWindowEx(WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TRANSPARENT, TEXT("OverlayClass"), TEXT("Overlay"), WS_POPUP, 0, 100, 200, 400, NULL, NULL, hInstance, NULL);
   SetLayeredWindowAttributes(hwnd, 0, 20, LWA_ALPHA);

   hWnd = hwnd;

   hHook = SetWindowsHookEx(WH_KEYBOARD_LL, [](int nCode, WPARAM wParam, LPARAM lParam) -> LRESULT {
      if (nCode == HC_ACTION && wParam == WM_KEYDOWN) {
         KBDLLHOOKSTRUCT* p = (KBDLLHOOKSTRUCT*)lParam;
         if (p->vkCode == 'X' && GetAsyncKeyState(VK_CONTROL) & 0x8000) {
            PostMessage(FindWindow(TEXT("OverlayClass"), TEXT("Overlay")), WM_TOGGLE_CLICKABLE, 0, 0);
            return 1;
         }
      }
      return CallNextHookEx(NULL, nCode, wParam, lParam);
      }, GetModuleHandle(NULL), 0);

   ShowWindow(hwnd, nCmdShow);
   UpdateWindow(hwnd);

   MSG msg;
   static ULONGLONG lastCheck = GetTickCount64();
   static PanelData lastData;
   while (true) {
      if (GetTickCount64() - lastCheck > 50) {
         PanelData data = ReceiveData();
         if (data.html != lastData.html || data.level != lastData.level) {
            lastData = data;
            InvalidateRect(hwnd, NULL, TRUE);
         }
         lastCheck = GetTickCount64();
      }

      if (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
         if (msg.message == WM_QUIT) break;
         TranslateMessage(&msg);
         DispatchMessage(&msg);
      }
      else {
         Sleep(10);  // ИСПРАВЛЕНО: Увеличен Sleep для снижения CPU и зависаний
      }
   }

   UnhookWindowsHookEx(hHook);
   closesocket(clientSocket);
   WSACleanup();
   return static_cast<int>(msg.wParam);
}
