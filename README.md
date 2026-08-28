# 회사명·이름 기반 예약 시스템

GitHub Pages 프런트엔드, Google Apps Script Web App, Google Spreadsheet를 연결한 예약 시스템입니다. 사용자는 회사명과 이름으로 로그인하고, 등록된 전체 일정을 달력에서 한눈에 확인해 1개의 예약을 만들 수 있습니다.

## 구성

- `index.html`, `app.js`, `style.css`, `layout-fix.css`: GitHub Pages 화면
- `Code.gs`: Google Apps Script API 및 Spreadsheet 초기화
- `명단.xlsx`: 개인정보가 포함된 원본 파일이므로 공개 Git 저장소에 올리지 않습니다.

## Google Spreadsheet 준비

1. 비공개 Google Spreadsheet를 만듭니다.
2. `명단.xlsx`의 두 시트를 가져와 시트 이름을 `사용자명단`, `예약가능날짜`로 유지합니다.
3. Apps Script 프로젝트 속성에 `SPREADSHEET_ID`를 추가하고 Spreadsheet ID를 저장합니다.
4. 프로젝트 속성에 `ADMIN_ACCESS_CODE`를 추가하고 별도로 정한 관리자 코드를 저장합니다. 코드는 Git에 기록하지 않습니다.
5. 최신 `Code.gs`를 Apps Script에 붙여넣고 `resetSystemFromImportedSheets()`를 한 번 실행합니다.

`resetSystemFromImportedSheets()`는 다음 시스템 시트를 새 구조로 초기화합니다. 기존 시스템 시트 데이터와 예약 내역은 삭제되므로 최초 구축 또는 의도적인 전체 초기화 때만 실행하세요.

| 시트 | 열 |
|---|---|
| Users | userId, company, departmentId, name, enabled |
| Departments | departmentId, company, departmentName, enabled |
| AvailableSlots | slotId, date, startTime, endTime, enabled |
| Reservations | reservationId, date, startTime, endTime, userId, company, name, departmentId, status, createdAt |
| Masters | company, departmentName, name, enabled |

초기화 함수는 `사용자명단`의 회사명·부서·성명을 사용자 목록으로 변환하고, `예약가능날짜`의 날짜 및 운영시간 조합을 예약 슬롯으로 만듭니다. 지정된 관리자 사용자가 원본 명단에 없으면 관리자 정보도 자동 추가합니다.

## 배포

1. Apps Script에서 `배포` → `새 배포` → `웹 앱`을 선택합니다.
2. 실행 사용자는 본인, 접근 권한은 운영 정책에 맞게 설정합니다.
3. 배포된 `/exec` URL을 `app.js`의 `API_URL`에 설정합니다.
4. 저장소의 `main` 브랜치로 GitHub Pages를 배포합니다.
5. `Code.gs`를 변경한 경우 기존 웹 앱 배포를 새 버전으로 갱신합니다.

## 로그인과 관리자 모드

- 일반 사용자는 회사명과 이름만 입력해 로그인합니다.
- 관리자도 먼저 일반 로그인합니다.
- 관리자 모드 버튼에서 별도 코드를 입력하면 서버가 `Masters` 정보와 `ADMIN_ACCESS_CODE`를 모두 검증합니다.
- 관리자 코드는 공개 프런트엔드나 저장소에 기록하지 않습니다.

회사명과 이름만 사용하는 방식은 강한 본인 인증이 아닙니다. 개인정보나 민감한 일정에 사용하려면 사내 Google 계정 인증 또는 별도의 인증 수단을 추가하세요.

## 예약 정책

- 사용자 1명당 `ACTIVE` 예약은 1개만 허용합니다.
- 예약 생성은 `LockService` 잠금 안에서 사용자 중복과 시간 중복을 다시 검사합니다.
- 예약 취소 시 행을 삭제하지 않고 상태를 `CANCELLED`로 변경합니다.
- 달력에는 원본 일정에 포함된 모든 달과 날짜가 연속으로 표시됩니다.
- 관리자는 전체 예약 화면에서 취소되지 않은 최종 예약만 Excel 호환 CSV로 다운로드할 수 있습니다.
