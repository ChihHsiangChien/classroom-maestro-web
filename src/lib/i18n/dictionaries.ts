
// @ts-nocheck
// Disabling TypeScript checking for this file because it's a massive object of strings
// and the type inference can be slow. The structure is validated by usage in the app.

export const dictionaries = {
  zh: {
    common: {
      or_create_manually: '或手動建立',
      submit: '提交',
      cancel: '取消',
      close: '關閉',
      save: '儲存',
      save_changes: '儲存變更',
      delete: '刪除',
      edit: '編輯',
      add: '新增',
      loading: '載入中...',
      error: '錯誤',
      success: '成功',
      copy: '副本',
      empty_option: '空選項',
    },
    firebase: {
      config_error_title: 'Firebase 設定錯誤',
      config_error_description: '您的 Firebase 環境變數未正確設定。',
      config_error_instructions_html: '請將您的 Firebase 專案憑證複製到專案根目錄的 <code>.env</code> 檔案中，然後重新啟動開發伺服器。',
      generic_auth_error_title: 'Firebase 驗證錯誤',
      auth_domain_error_title: '操作要求：授權您的應用程式網域',
      auth_domain_error_description_p1: '為了使用 Google 登入，Firebase 要求您明確授權您的應用程式執行所在的網域。',
      auth_domain_error_description_p2: '您的應用程式網域是：',
      auth_domain_error_instructions: '請將此確切網域新增到您 Firebase 專案驗證設定中的「已授權的網域」清單中。',
      auth_domain_error_button: '開啟 Firebase 驗證設定',
      auth_anon_error_title: '匿名登入已停用',
      auth_anon_error_description: '本應用程式使用匿名登入，以安全地讓學生加入教室。此功能目前在您的 Firebase 專案中被停用。',
      auth_anon_error_instructions: '要解決此問題，請在您的 Firebase Authentication 設定中，啟用「匿名」登入提供者。',
      auth_anon_error_button: '前往 Firebase 登入設定',
      firestore_permission_denied_title: 'Firestore 權限錯誤',
      firestore_permission_denied_description: '您的資料庫安全規則阻止了此操作。',
      firestore_permission_denied_button: '點擊此處修正您的安全規則',
      firestore_generic_error_description: 'Could not {action} class. Please try again.',
    },
    landingPage: {
      title: 'Classroom Maestro',
      description: '現代化學習的互動教室。',
      teacher_signin_title: '教師登入',
      teacher_signin_description: '存取您的儀表板以管理教室。',
      teacher_signin_description_google: '使用您的 Google 帳戶登入以繼續。',
      signin_with_google_button: '使用 Google 登入',
    },
    dashboard: {
      title: '儀表板',
      sign_out: '登出',
      select_class: '選擇班級',
      select_class_description: '請選擇一個班級以開始或建立一個新班級。',
      add_class: '新增班級',
      edit_class: '編輯班級',
      delete_class: '刪除班級',
      delete_class_confirm_title: '確定要刪除班級嗎？',
      delete_class_confirm_description: '這將永久刪除「{name}」及其所有學生。此操作無法復原。',
      class_name_label: '班級名稱',
      class_name_placeholder: '例如「三年級甲班」',
      no_classes: '沒有班級',
      no_classes_description: '點擊「新增班級」以開始。',
      start_activity: '開始上課',
      back_to_classes: '返回班級列表',
      import_students: '匯入學生',
      import_students_description: '將學生名單貼到下方，每行一個名字。',
      select_file: '選擇檔案',
      or_drop_file: '或將檔案拖放到此處',
      txt_files_only: '僅限 .txt 檔案',
      toast_class_created_title: '班級已建立！',
      toast_class_created_description: '下一步：請為這個班級新增學生。',
      toast_class_updated: '班級已更新！',
      toast_class_deleted: '班級已刪除',
      toast_students_imported_title: '學生已匯入',
      toast_students_imported_description: '{count} 位學生已成功加入班級。',
      toast_import_error_title: '匯入失敗',
      toast_import_error_description: '無法讀取檔案。請確認它是純文字格式。',
      edit_students_list: '編輯學生名單',
      student_count: '{count} 位學生',
      actions_menu_tooltip: '更多選項',
      delete_history_button: '刪除活動紀錄',
      download_history_button: '下載活動紀錄',
      delete_history_confirm_title: '確定要刪除所有活動紀錄嗎？',
      delete_history_confirm_description: '這將永久刪除「{name}」的所有學生提交內容。此操作無法復原。',
      toast_history_deleted: '活動紀錄已刪除。',
      toast_history_no_data_to_delete: '沒有可刪除的活動紀錄。',
      toast_history_download_start: '正在準備下載...',
      toast_history_download_no_data: '找不到可下載的活動紀錄。',
      toast_history_download_error: '下載紀錄時發生錯誤。',
      download_history_dialog_title: '下載活動紀錄',
      download_history_dialog_description: '請選擇您要下載的格式。',
      download_format_json_button: 'JSON (所有資料)',
      download_format_json_description: '包含所有提交資料的單一檔案。適合開發者或重新匯入。',
      download_format_csv_zip_button: 'CSV 與圖片 (ZIP)',
      download_format_csv_zip_description: '一個 ZIP 壓縮檔，包含 CSV 格式的文字回答以及所有獨立的繪圖圖片檔。',
      toast_history_preparing_zip: '正在準備您的 ZIP 檔案，請稍候...',
      classes: '班級',
      redirecting: '正在重導向到儀表板...',
    },
    teacherLoginForm: {
      room_code_label: '教室代碼',
      room_code_placeholder: '例如 DEMO',
      password_label: '密碼',
      password_placeholder: '••••••••',
      signin_button: '登入',
      toast_success_title: '已登入！',
      toast_success_description: '正在將您重定向到教師儀表板。',
      toast_error_title: '登入失敗',
      toast_error_description: '無效的教室代碼或密碼。請再試一次。',
    },
    joinPage: {
      title: '加入教室',
      description: '請從下方列表選擇你的名字登入。',
      error_title: '無法加入教室',
      invalid_link_error: '教室連結無效或損毀。請向老師索取新的連結。',
      no_classroom_error: '未指定教室。請使用老師提供的連結。',
      no_students_error: '這個教室目前沒有學生。請聯繫您的老師。',
      class_not_found_error: '找不到此教室。請檢查連結或聯繫您的老師。',
      generic_fetch_error: '讀取教室資料時發生錯誤。請再試一次。',
      classroom_locked_title: '教室已鎖定',
      classroom_locked_description: '老師已鎖定此活動，目前無法加入。',
      logged_in: '已登入',
    },
    classroomPage: {
      submission_received_title: '收到提交！',
      submission_received_description: '您的回答已被記錄。請等待老師繼續課程。',
      answer_another_question_button: '回答另一個問題',
      welcome_title: '歡迎, {studentName}！',
      welcome_description: '課程即將開始。請等待老師開始活動。',
      logout_disabled_tooltip: '老師已鎖定教室，因此無法登出。',
      snatch_countdown: '準備搶答...',
      snatch_go: '搶！',
      snatch_you_won: '恭喜！您搶到了！',
      snatch_too_slow: '差一點！',
      snatch_winner_was: '優勝者是 {name}',
      snatch_waiting: '正在確認結果...',
      session_ended_title: '課程已結束',
      session_ended_description: '老師可能已離開連線。您可以嘗試重新加入。',
      rejoin_session_button: '重新加入課程',
      your_score: '你的分數: {score}',
      your_rank: '排名: 第 {rank} 名',
    },
    teacherDashboard: {
      title: '活動中心',
      exit_button: '離開教室',
      create_question_card_title: '建立新問題',
      create_question_card_description: '透過即時問題吸引您的學生。',
      end_question_button: '結束問題',
      reveal_answer_button: '公佈答案並計分',
      lesson_status_card_title: '活動狀態',
      question_active: '問題進行中',
      question_type_active: '{questionType} 進行中',
      idle: '閒置',
      responses_count: '{submissionsCount} / {studentsCount} 個回答',
      start_a_question_prompt: '開始一個問題以開始',
      live_poll_description: '問題已啟用，請在下方查看學生回覆。',
      simulate_student_view_button: '模擬學生視角',
      session_history_title: '本次課堂活動紀錄',
      session_history_description: '回顧並重複使用本次課堂的提問，或將整個活動組合儲存為新的教材。',
      reuse_question_button: '再次使用',
      save_as_courseware_button: '儲存為新教材',
      save_courseware_dialog_title: '將課堂活動儲存為教材',
      save_courseware_dialog_description: '這將會把本次課堂中的所有活動，建立成一個新的教材包。',
      activity_in_progress_title: '活動進行中',
      activity_in_progress_description: '請先結束目前的活動，再開始新的活動。',
    },
    createQuestionForm: {
      tab_true_false: '是非題',
      tab_multiple_choice: '選擇題',
      tab_short_answer: '簡答題',
      tab_drawing: '繪圖',
      tab_annotation: '圖片標註',
      generate_with_ai_label: '使用 AI 生成',
      generate_with_ai_placeholder: '例如「光合作用」',
      generate_with_ai_description: '輸入一個主題，讓 AI 為您建立一個選擇題。',
      poll_question_label: '選擇題問題',
      poll_question_placeholder: '我們接下來應該學習什麼？',
      answer_options_label: '答案選項',
      correct_answer_label: '正確答案',
      option_placeholder: '選項 {letter}',
      add_option_button: '新增選項',
      allow_multiple_selections_label: '允許多選',
      allow_multiple_selections_description: '學生可以選擇多個答案。',
      start_question_button: '開始問題',
      tf_question_label: '是非題問題',
      tf_question_placeholder: '例如：地球是平的。',
      sa_question_label: '簡答題問題',
      sa_question_placeholder: '例如：細胞學說內容是什麼？',
      drawing_prompt_label: '繪圖提示',
      drawing_prompt_placeholder: '例如：畫一個水循環圖。',
      annotation_prompt_label: '標註提示（可選）',
      annotation_prompt_placeholder: '例如：「在細胞圖中圈出粒線體。」',
      canvas_label: '畫布',
      canvas_description: '上傳、貼上或繪製您希望學生標註的圖片。',
      toast_get_image_error: '無法從編輯器獲取圖片資料。',
      question_empty_error: '問題不可為空。',
      option_empty_error: '選項內容不可為空。',
      options_min_error: '選擇題至少需要 2 個選項。',
      answer_empty_error: '請設定一個正確答案。',
      untitled_question: '(無標題問題)',
    },
    activityEditor: {
      generate_image_label: '使用 AI 生成圖片',
      generate_image_placeholder: '例如：「一個簡單的植物細胞圖」',
      generate_image_button: '生成圖片',
      generating_image: '正在生成圖片...',
      toast_image_generated_title: '圖片已生成',
      toast_image_generated_description: '新圖片已新增至畫布中，可供編輯。',
    },
    activePoll: {
      live_results_title: '即時結果',
      votes_count: '{count} 票',
      total_respondents: '{count} 位學生已回答',
      student_responses_title: '學生回答',
      student_table_header: '學生',
      waiting_for_submissions: '等待提交中...',
      analyze_with_ai_button: '使用 AI 分析答案',
      analyze_with_ai_min_submissions: '需要至少 2 份提交才能進行分析。',
      ai_analyzing_message: 'AI 正在分析答案...',
      ai_summary_card_title: 'AI 摘要與分析',
      keyword_cloud_card_title: '關鍵字雲',
      keyword_frequency_card_title: '關鍵字頻率',
      original_image_title: '原始圖片',
      student_drawings_title: '學生繪圖',
      thumbnail_size_label: '縮圖尺寸',
      submission_status_card_title: '學生狀態',
      submission_status_card_description: '查看學生的連線、提交與排序狀態。',
      submitted_status: '已提交',
      simulate_submission_button: '模擬提交',
      toast_analysis_data_error_title: '資料不足',
      toast_analysis_data_error_description: '需要至少兩個答案才能進行分析。',
      toast_analysis_failed_title: '分析失敗',
      sort_by_label: '排序依據',
      sort_by_submission_time: '提交時間',
      sort_by_student_name: '學生姓名',
      sort_order_asc: '升冪',
      sort_order_desc: '降冪',
    },
    drawingEditor: {
      pen_tool: '畫筆',
      eraser_tool: '橡皮擦',
      select_tool: '選取',
      color_picker_tool: '顏色選擇器',
      add_text_tool: '新增文字',
      upload_image_tool: '上傳圖片',
      camera_tool: '相機',
      delete_selected_tool: '刪除選取',
      clear_all_button: '全部清除',
      take_a_picture_title: '拍照',
      camera_access_denied_title: '相機存取被拒',
      camera_access_denied_description: '請在您的瀏覽器設定中啟用相機權限。',
      camera_select_label: '相機',
      camera_select_placeholder: '選擇一個相機',
      capture_button: '拍攝',
      toast_image_pasted_title: '圖片已貼上',
      toast_image_pasted_description: '已將您剪貼簿中的圖片新增到畫布上。',
      text_default: '在此輸入',
    },
    lotteryModal: {
      title: '幸運兒是...',
      submission_title: '提交的答案',
      not_submitted_message: '這位學生尚未提交答案。',
      pick_again_button: '再抽一位',
      start_picking_button: '開始抽人',
      reset_button: '重置名單',
      pick_from_online_label: '僅從已登入學生中抽取',
      unique_pick_label: '抽出後從名單移除 (不重複抽)',
      unpicked_list_title: '未抽中名單',
      picked_list_title: '已抽中名單',
      no_one_picked_yet: '尚未抽出任何人。',
      lottery_no_students_in_pool: '此條件下沒有可抽取的學生。',
      lottery_reset_toast: '抽人名單已重置。',
      lottery_reset_title: '抽人重置',
      lottery_reset_description: '所有學生都已經被抽過了。新一輪抽人現在開始。',
      picking_in_progress: '抽人中...'
    },
    studentManagement: {
      title: '教室管理',
      description: '與您的班級分享連結或 QR Code。',
      classroom_url_label: '教室連結',
      copy_button_toast_title: '已複製到剪貼簿！',
      copy_button_toast_description: '您現在可以與您的學生分享連結。',
      scan_to_join: '掃描加入',
      url_too_long_for_qr: '教室連結過長，無法生成 QR Code。請直接分享連結。',
      roster_card_title: '班級名冊',
      roster_student_count: '{count} 位學生',
      lottery_button: '抽人',
      snatch_button: '搶權',
      snatch_active: '搶權進行中...',
      snatch_countdown: '搶權即將開始！',
      snatch_reset_button: '重設搶權',
      snatch_winner_is: '優勝者: {name}',
      snatch_finished_title: '搶權結束',
      snatch_no_winner: '沒有產生優勝者。',
      table_header_name: '姓名',
      table_header_actions: '操作',
      no_students_in_roster: '此班級名冊中沒有學生。',
      no_students_logged_in_message: '班級名冊中沒有學生。',
      add_student_button: '新增學生',
      add_student_dialog_title: '新增學生',
      add_student_name_label: '姓名',
      toast_student_added_title: '學生已新增',
      toast_student_added_description: '{name} 已被新增到名冊中。',
      edit_student_dialog_title: '編輯學生',
      toast_student_updated_title: '學生已更新',
      toast_student_updated_description: '學生記錄已更新。',
      delete_student_alert_title: '您確定嗎？',
      delete_student_alert_description: '這將從名冊中永久刪除 {name}。此操作無法復原。',
      toast_student_deleted_title: '學生已刪除',
      toast_student_deleted_description: '{name} 已從名冊中移除。',
      import_students_description: '將學生名單貼到下方，每行一個名字。',
      paste_student_list_label: '學生名單',
      paste_student_list_placeholder: '請在此貼上學生名單。\n每行一個學生姓名。\n例如：\n王大明\n李小花\n陳志明',
      add_students_button: '新增名單中的學生',
      status_attentive: '專心',
      status_inattentive: '可能分心',
      status_offline: '離線',
      kick_student_tooltip: '登出學生',
      toast_student_kicked_title: '學生已被登出',
      student_status_card_title: '學生狀態',
      student_status_card_description: '查看學生的連線、提交與排序狀態。',
      submitted_status: '已提交',
      waiting_status: '等待中...',
      sort_by_label: '排序依據',
      sort_by_name: '姓名',
      sort_by_status: '登入狀態',
      sort_by_submission: '提交狀態',
      sort_order_asc: '升冪',
      sort_order_desc: '降冪',
      lock_classroom_label: '鎖定教室',
      lock_classroom_description: '防止學生加入或離開此活動。',
      ping_students_tooltip: '檢查學生專注度',
    },
    studentPoll: {
      choose_your_answer: '選擇您的答案:',
      choose_your_answers: '選擇您的答案 (可複選):',
      submit_vote_button: '提交選擇',
      your_answer_label: '您的答案',
      your_answer_placeholder: '在此輸入您的答案...',
      submit_answer_button: '提交答案',
      unknown_question_type: '未知的問題類型。',
      drawing_description: '請使用下方的編輯器來完成您的作答。',
    },
    studentAnswerResult: {
      correct: '答對了！',
      incorrect: '答錯了',
      your_answer: '你的答案',
      correct_answer: '正確答案',
      no_answer: '你沒有作答',
    },
    admin: {
      title: '管理面板',
      description: '查看所有教師的統計資料並管理帳戶。',
      table_header_teacher: '教師',
      table_header_email: '電子郵件',
      table_header_class_count: '班級數',
      table_header_courseware_count: '教材數',
      table_header_student_count: '學生總數',
      table_header_actions: '操作',
      you_label: '您',
      delete_confirm_title: '確定要刪除 {name} 嗎？',
      delete_confirm_description: '這是一個兩步驟、不可逆的操作。請謹慎進行。',
      delete_step1_title: '步驟一：刪除所有資料',
      delete_step1_description: '這將永久刪除此教師的所有班級、學生名冊和活動紀錄。這是刪除帳戶前的必要步驟。',
      delete_data_button: '永久刪除資料',
      delete_step2_title: '步驟二：刪除使用者帳戶',
      delete_step2_description: '資料清除後，請從 Firebase 控制台手動刪除該使用者的登入帳戶。',
      delete_user_account_button: '前往 Firebase 控制台',
      delete_data_success_title: '資料已刪除',
      delete_data_success_description: '{name} 的所有教室資料已被清除。',
      error_not_logged_in: '您必須登入才能執行此操作。',
      table_header_last_activity: '上次使用',
      last_activity_never: '從未使用',
      ai_usage_dashboard: 'AI 使用量',
    },
    courseware: {
      title: '教材',
      description: '管理您可重複使用的教材與活動。',
      my_packages: '我的教材',
      create_package: '建立教材',
      edit_package: '編輯教材',
      package_name_label: '教材名稱',
      package_name_placeholder: '例如：「A1-1 細胞」',
      no_packages_title: '尚無教材',
      no_packages_description: '點擊「建立教材」以開始。',
      activities: '活動',
      add_activity: '新增活動',
      edit_activity: '編輯活動',
      delete_package: '刪除教材',
      delete_package_confirm_title: '確定要刪除此教材嗎？',
      delete_package_confirm_description: '這將永久刪除「{name}」及其所有活動。此操作無法復原。',
      delete_activity_confirm_title: '確定要刪除此活動嗎？',
      delete_activity_confirm_description: '此操作無法復原。',
      toast_package_created: '教材已建立。',
      toast_package_updated: '教材已更新。',
      toast_package_deleted: '教材已刪除。',
      toast_activity_saved: '活動已儲存。',
      toast_activity_deleted: '活動已刪除。',
      activity_editor_title_add: '新增活動',
      activity_editor_title_edit: '編輯活動',
      use_courseware: '使用教材',
      use_courseware_description: '從您的教材中選擇一個預先製作的問題來發送。',
      select_package: '選擇教材',
      no_activities_in_unit: '此教材中沒有活動。',
      send_question: '發送問題',
      loading: '正在載入教材...',
      package_name_empty_error: '教材名稱不可為空。',
      duplicate: '建立副本',
      move_to: '移動至...',
      toast_package_duplicated: '教材已建立副本。',
      toast_activity_duplicated: '活動已建立副本。',
      toast_activity_moved: '活動已移動。',
      no_other_packages: '沒有其他教材可供移動。',
      generate_from_text: '從內文生成問題',
      generate_from_text_description: '貼上一段課文，讓 AI 自動生成相關問題。',
      paste_content_label: '貼上課文內容',
      paste_content_placeholder: '在此貼上您的課文...',
      add_to_courseware_label: '新增至',
      select_courseware_placeholder: '請選擇一個教材',
      generate_questions_button: '生成問題',
      generating_questions: '正在生成問題...',
      toast_questions_generated_title: '問題已生成',
      toast_questions_generated_description: '{count} 個新問題已新增至「{name}」。',
      toast_no_courseware_selected: '請先選擇一個教材。',
      create_new_courseware_option: '建立新教材',
      add_to_existing_option: '新增至現有教材',
      new_courseware_name_label: '新教材名稱',
      num_true_false_label: '是非題數量',
      num_single_choice_label: '單選題數量',
      num_multiple_answer_label: '複選題數量',
      num_short_answer_label: '簡答題數量',
      num_drawing_label: '繪圖題數量',
      toast_ai_error_description: 'AI 回傳的資料格式不符預期。請參考下方的原始回應，並回報此問題以協助修正：',
    },
    leaderboard: {
      title: '排行榜',
      description: '本節課的即時分數',
      points: '分',
      no_scores: '尚無分數。',
      toast_scores_awarded_title: '已計分！',
      toast_scores_awarded_description: '{count} 位答對的學生各獲得 {points} 分。',
    },
    language_switcher: {
      title: '語言',
    },
    ai_usage: {
      title: "AI 使用量儀表板",
      description: "檢視平台上 AI 功能的使用情況。",
      usage_by_feature_chart_title: "各功能使用量",
      usage_over_time_chart_title: "每日使用趨勢",
      raw_logs_table_title: "詳細使用紀錄",
      table_header_feature: "功能",
      table_header_user: "使用者",
      table_header_timestamp: "時間戳記",
      feature_name_generatePoll: "生成選擇題",
      feature_name_generateImage: "生成圖片",
      feature_name_analyzeShortAnswers: "分析簡答題",
      feature_name_generateQuestionsFromText: "從內文生成問題",
      no_data: '尚無資料',
    },
    classDismissed: {
      title: '課程已結束',
      description: '感謝您的參與！您可以安全地關閉此頁面。',
      return_home_button: '返回首頁',
    },
    sessionTimer: {
        title: '課程計時',
        description: '剩餘時間',
        dismiss_now_button: '立即下課',
        extend_time_button: '延長5分鐘',
        time_extended_toast: '課程時間已延長5分鐘。',
        class_dismissed_toast: '課程已結束。',
        minutes_remaining: '{minutes} 分鐘',
        less_than_a_minute: '不到一分鐘',
    },
  },
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = typeof dictionaries[Locale];

// Helper function to replace placeholders like {name}
export const formatString = (str: string, values: Record<string, string | number>): string => {
  return str.replace(/\{(\w+)\}/g, (placeholderWithBraces, placeholder) => {
    return values[placeholder] !== undefined ? String(values[placeholder]) : placeholderWithBraces;
  });
};
