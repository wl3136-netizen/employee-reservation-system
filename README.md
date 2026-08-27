# 사번 기반 날짜·시간 예약 시스템

GitHub Pages 정적 프론트엔드와 Google Apps Script Web App, Google Spreadsheet를 연결한 예약 시스템입니다. 일반 사용자는 자신의 사업부에 열린 일정만 예약·조회·취소할 수 있고, 마스터 권한은 Apps Script 서버가 `Masters` 시트로 검사합니다.

## 파일 구성

- `index.html`: 로그인, 달력, 내 예약, 마스터 관리 화면
- `style.css`: PC·모바일 반응형 디자인
- `app.js`: 화면 상태 및 REST API 호출
- `Code.gs`: Apps Script REST API, 검증, 권한, 동시 예약 잠금

## 1. Google Spreadsheet 준비

사용할 스프레드시트에는 아래 5개 시트를 구성합니다. 실제 스프레드시트 링크와 ID는 공개 저장소에 기록하지 않습니다. 직접 새로 만들 때는 빈 스프레드시트에 Apps Script를 연결한 뒤 `setupSheets()`를 한 번 실행해도 됩니다.

| 시트 | 헤더 |
|---|---|
| Users | employeeId, name, department, enabled |
| Departments | departmentId, departmentName, enabled |
| AvailableSlots | slotId, date, startTime, endTime, departmentId, enabled |
| Reservations | reservationId, date, startTime, endTime, employeeId, name, departmentId, status, createdAt |
| Masters | employeeId, name, enabled |

날짜는 `yyyy-MM-dd`, 시간은 `HH:mm`, 사용 여부는 `TRUE/FALSE` 형식으로 입력합니다. 사번은 8자리 숫자로 입력하며, 앞의 0을 유지할 수 있도록 셀 서식을 일반 텍스트로 두는 것을 권장합니다.

### 테스트 데이터 사용 시 주의사항

- 공개 저장소에는 실제 로그인 가능한 사번이나 마스터 계정을 기록하지 마세요.
- 테스트 계정은 운영 계정과 분리하고, 테스트가 끝나면 `enabled`를 `FALSE`로 변경하거나 삭제하세요.
- 예약 슬롯은 배포 시점 이후의 임의 일정으로 구성하세요.

구체적인 테스트 계정은 공개 문서가 아닌 별도의 비공개 채널로 관리하세요. `Masters`에만 있고 `Users`에 없는 사번은 로그인할 수 없습니다.

### 사용자 목록 한 번에 등록

사용자 목록은 `Users` 시트의 A2 셀부터 아래 4개 열 순서로 복사·붙여넣기 하면 한 번에 등록할 수 있습니다.

| employeeId | name | department | enabled |
|---|---|---|---|
| 100101 | 홍길동 | DEV | TRUE |
| 100102 | 김영희 | MFG | TRUE |

- `department`는 `Departments` 시트에 등록된 `departmentId`와 정확히 일치해야 합니다.
- `enabled`는 사용 계정이면 `TRUE`, 중지 계정이면 `FALSE`를 입력합니다.
- 사번 앞의 0을 유지해야 한다면 붙여넣기 전에 `employeeId` 열의 셀 서식을 **일반 텍스트**로 설정합니다.
- 기존 행을 포함해 붙여넣으면 중복 사번이 생길 수 있으므로, 신규 등록은 마지막 데이터 다음 빈 행부터 붙여넣습니다.

## 2. Apps Script 코드 등록

1. 스프레드시트에서 **확장 프로그램 → Apps Script**를 엽니다.
2. 기본 `Code.gs` 내용을 삭제하고 이 프로젝트의 `Code.gs` 전체를 붙여 넣습니다.
3. Apps Script의 **프로젝트 설정 → 스크립트 속성**으로 이동합니다.
4. 속성 `SPREADSHEET_ID`를 만들고 대상 Spreadsheet ID를 입력합니다.
5. 프로젝트 시간대를 `Asia/Seoul`로 설정합니다.
6. 필요하면 편집기에서 `setupSheets()`를 한 번 실행해 권한을 승인합니다.

Spreadsheet ID는 주소 `https://docs.google.com/spreadsheets/d/여기가_ID/edit`의 가운데 문자열입니다. ID를 `Code.gs`나 프론트엔드에 직접 하드코딩하지 않습니다.

실제 스프레드시트 ID는 Apps Script의 비공개 스크립트 속성에만 저장합니다.

## 3. Web App 배포

1. Apps Script 우측 상단 **배포 → 새 배포**를 선택합니다.
2. 유형은 **웹 앱**을 선택합니다.
3. 실행 사용자는 **나**로 설정합니다.
4. 액세스 권한은 외부 접속 요건에 맞춰 **모든 사용자**를 선택합니다. Google Workspace 정책에 따라 선택지가 제한될 수 있습니다.
5. 배포 후 생성된 `/exec` URL을 복사합니다.
6. `app.js` 상단 `API_URL`의 `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL`을 이 URL로 교체합니다.

Apps Script 코드를 수정한 뒤에는 **배포 관리 → 수정 → 새 버전**으로 다시 배포해야 운영 URL에 반영됩니다.

## 4. GitHub Pages 연결

1. 새 GitHub 저장소를 만들고 `index.html`, `style.css`, `app.js`를 저장소 루트에 올립니다. `Code.gs`와 `README.md`도 배포·관리용으로 함께 보관할 수 있습니다.
2. 저장소 **Settings → Pages**에서 Source를 **Deploy from a branch**로 선택합니다.
3. Branch를 `main`, 폴더를 `/(root)`로 선택하고 저장합니다.
4. 표시된 `https://계정명.github.io/저장소명/` 주소로 접속합니다.

GitHub Pages는 정적 파일만 호스팅하고, 데이터 처리는 Apps Script Web App이 담당합니다.

## 5. 마스터 계정 등록

1. `Users`에 마스터가 로그인할 사번, 이름, 사업부, `TRUE`를 입력합니다.
2. 같은 사번을 `Masters`에도 입력하고 `enabled`를 `TRUE`로 둡니다.
3. 마스터 사번은 프론트엔드 코드에 기록하지 않습니다. 마스터 API 호출 때마다 서버가 로그인 세션과 `Masters` 시트를 확인합니다.

## 6. 테스트 순서

1. `app.js`의 API URL을 설정하고 GitHub Pages 주소를 엽니다.
2. 존재하지 않는 사번으로 로그인하여 오류 안내를 확인합니다.
3. `Users.enabled=FALSE`인 테스트 계정으로 접근 차단을 확인합니다.
4. 별도로 등록한 일반 테스트 사용자로 로그인하여 달력의 예약 가능 날짜와 시간을 확인합니다.
5. 예약 후 **내 예약**에서 조회하고 취소합니다. `Reservations` 행이 삭제되지 않고 `status=CANCELLED`로 변경되는지 확인합니다.
6. 브라우저 두 개에서 같은 슬롯을 동시에 예약하여 하나만 성공하는지 확인합니다.
7. 별도로 등록한 마스터 테스트 사용자로 사용자·사업부·일정 등록/수정 및 전체 예약 취소를 확인합니다.
8. 다른 사업부 사용자가 해당 사업부 슬롯만 볼 수 있는지 확인합니다.

## 7. API 형식

모든 요청은 POST JSON이며 `Content-Type: text/plain;charset=utf-8`을 사용합니다. Apps Script Web App의 불필요한 CORS 사전 요청을 피하기 위한 구성입니다.

```json
{"action":"login","employeeId":"<TEST_EMPLOYEE_ID>"}
```

로그인 이후에는 응답받은 토큰을 함께 보냅니다.

```json
{"action":"getMyReservations","token":"로그인_응답_토큰"}
```

응답은 항상 다음 중 하나입니다.

```json
{"success":true,"data":{}}
```

```json
{"success":false,"message":"사용자가 이해할 수 있는 오류 메시지"}
```

## 8. 보안 및 운영 주의사항

- 사번만으로 로그인하는 현재 버전은 **본인 인증 기능이 아닙니다**. 개인정보나 민감 일정에 사용하기 전 PIN(해시 저장), 사내 Google 계정 이메일 검증 또는 별도 인증을 반드시 추가하세요.
- Web App을 모든 사용자에게 공개하면 API URL도 외부에서 호출할 수 있습니다. 서버 검증은 적용되어 있지만, 조직 정책에 따라 접근 범위를 제한하는 것이 좋습니다.
- 로그인 토큰은 Apps Script `CacheService`에 6시간 보관되고 브라우저 `sessionStorage`에만 저장됩니다. 서버 재시작·캐시 축출 시 다시 로그인해야 합니다.
- `SPREADSHEET_ID`, 마스터 목록, 인증 비밀값은 프론트엔드에 넣지 않습니다.
- `LockService`로 예약 저장 구간을 잠그고, 잠금 안에서 슬롯 활성 여부·사업부·과거 시간·중복 예약을 다시 검증합니다.
- 취소는 행을 삭제하지 않고 `CANCELLED`로 변경합니다. 감사 이력을 강화하려면 `cancelledAt`, `cancelledBy` 열을 추가하는 확장을 권장합니다.
- 현재 조회는 Apps Script 실행량을 고려해 시트별 데이터를 한 번의 범위 읽기로 가져옵니다. 데이터가 수만 행 이상으로 커지면 연도별 보관 시트, 캐시, 인덱스 시트 또는 별도 DB를 검토하세요.
- GitHub Pages 저장소가 공개라면 `Code.gs`에 비밀값을 절대 커밋하지 마세요. 현재 코드는 스크립트 속성만 사용합니다.

## 확장 지점

- `login_()` 앞에 PIN 또는 이메일 인증 검증 추가
- `AvailableSlots`에 장소, 정원, 예약 단위, 최대 인원 열 추가
- `Reservations`에 취소일시와 취소자 추가
- 알림 메일, 예약 마감 시간, 사용자별 예약 횟수 제한 추가
