import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav & Common
    home: 'Home',
    games: 'Games',
    wingo: 'Win Go',
    cricket: 'Cricket',
    aviator: 'Aviator',
    mines: 'Mines',
    roulette: 'Roulette',
    chicken_road: 'Chicken Road',
    plinko: 'Plinko',
    wallet: 'Wallet',
    profile: 'Profile',
    activity: 'Activity',
    promotion: 'Promotion',
    vip: 'VIP',
    support: 'Support',
    settings: 'Settings',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    balance: 'Balance',
    total_balance: 'Total Balance',
    recharge: 'Recharge',
    history: 'History',
    all: 'All',
    success: 'Success',
    pending: 'Pending',
    failed: 'Failed',
    cancel: 'Cancel',
    confirm: 'Confirm',
    submit: 'Submit',
    save: 'Save',
    delete: 'Delete',
    back: 'Back',
    close: 'Close',
    loading: 'Loading...',

    // Login / Register
    login: 'Login',
    register: 'Register',
    phone_number: 'Phone Number',
    enter_phone: 'Enter phone number',
    password: 'Password',
    enter_password: 'Enter password',
    forgot_password: 'Forgot Password?',
    forgot_password_tip: 'For security reasons, password recovery is managed by Customer Care. Please contact Support.',
    contact_support: 'Contact Support',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    login_successful: 'Login successful!',
    register_successful: 'Account created successfully!',

    // Wallet & Bank
    add_bank: 'Add Bank Account',
    bank_name: 'Bank Name',
    account_holder: 'Account Holder Name',
    account_number: 'Account Number',
    ifsc_code: 'IFSC Code',
    enter_bank_name: 'Enter bank name (e.g. SBI, HDFC)',
    enter_account_holder: 'Enter full name on passbook',
    enter_account_number: 'Enter account number',
    enter_ifsc_code: 'Enter 11-digit IFSC code',
    max_bank_reached: 'Maximum 3 bank accounts allowed',
    delete_bank: 'Delete Bank Account',
    enter_password_to_delete: 'Enter your account password to confirm deletion',
    bank_added_success: 'Bank account added successfully',
    bank_deleted_success: 'Bank account deleted',
    select_bank_withdraw: 'Select Bank for Withdrawal',
    enter_withdraw_amount: 'Enter withdrawal amount',
    min_withdraw: 'Minimum withdrawal: ₹100',

    // Support
    customer_service: 'Customer Service & AI Help',
    ai_assistant: 'AI Support Assistant',
    admin_live_chat: 'Live Admin Support',
    type_message: 'Type your message...',
    attach_media: 'Attach Photo/Video',
    connected_to_admin: 'Connected to Live Support Executive',
    escalated_to_admin: 'Issue transferred to live admin team',

    // Games
    bet_history: 'Bet History',
    my_bets: 'My Bets',
    round_history: 'Round History',
    bet_amount: 'Bet Amount',
    multiplier: 'Multiplier',
    payout: 'Payout',
    cash_out: 'Cash Out',
    start_game: 'Start Game',
    mine_count: 'Mines Count',
    place_bet: 'Place Bet',
    win: 'Win',
    loss: 'Loss',

    // Settings
    language_select: 'Language',
    hindi: 'हिंदी (Hindi)',
    english: 'English',
    sound: 'Game Sound',
    sound_effects: 'Sound Effects',
    notifications: 'Notifications',
    app_version: 'App Version',
    logout: 'Log Out',
    security_center: 'Security Center',
    bank_cards: 'Bank Cards / UPI',
  },
  hi: {
    // Nav & Common
    home: 'होम',
    games: 'गेम्स',
    wingo: 'विन गो',
    cricket: 'क्रिकेट',
    aviator: 'एविएटर',
    mines: 'माइंस',
    roulette: 'रूलेट',
    chicken_road: 'चिकन रोड',
    plinko: 'प्लिंको',
    wallet: 'वॉलेट',
    profile: 'प्रोफाइल',
    activity: 'गतिविधि',
    promotion: 'प्रमोशन',
    vip: 'वीआईपी',
    support: 'कस्टमर केयर',
    settings: 'सेटिंग्स',
    deposit: 'जमा करें',
    withdraw: 'निकासी',
    balance: 'बैलेंस',
    total_balance: 'कुल बैलेंस',
    recharge: 'रिचार्ज',
    history: 'इतिहास',
    all: 'सभी',
    success: 'सफल',
    pending: 'प्रक्रिया में',
    failed: 'विफल',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    submit: 'जमा करें',
    save: 'सहेजें',
    delete: 'हटाएं',
    back: 'वापस',
    close: 'बंद करें',
    loading: 'लोड हो रहा है...',

    // Login / Register
    login: 'लॉग इन करें',
    register: 'रजिस्टर करें',
    phone_number: 'मोबाइल नंबर',
    enter_phone: 'मोबाइल नंबर दर्ज करें',
    password: 'पासवर्ड',
    enter_password: 'पासवर्ड दर्ज करें',
    forgot_password: 'पासवर्ड भूल गए?',
    forgot_password_tip: 'सुरक्षा कारणों से, पासवर्ड रीसेट कस्टमर केयर द्वारा किया जाता है। कृपया सपोर्ट से संपर्क करें।',
    contact_support: 'कस्टमर सपोर्ट से संपर्क करें',
    no_account: 'क्या आपका खाता नहीं है?',
    have_account: 'पहले से खाता है?',
    login_successful: 'सफलतापूर्वक लॉग इन हुए!',
    register_successful: 'खाता सफलतापूर्वक बनाया गया!',

    // Wallet & Bank
    add_bank: 'बैंक खाता जोड़ें',
    bank_name: 'बैंक का नाम',
    account_holder: 'खाता धारक का नाम',
    account_number: 'खाता संख्या (Account Number)',
    ifsc_code: 'आईएफएससी कोड (IFSC Code)',
    enter_bank_name: 'बैंक का नाम दर्ज करें (जैसे SBI, HDFC)',
    enter_account_holder: 'पासबुक पर लिखा पूरा नाम',
    enter_account_number: 'खाता संख्या दर्ज करें',
    enter_ifsc_code: '11 अंकों का IFSC कोड दर्ज करें',
    max_bank_reached: 'अधिकतम 3 बैंक खाते जोड़े जा सकते हैं',
    delete_bank: 'बैंक खाता हटाएं',
    enter_password_to_delete: 'खाता हटाने के लिए अपना लॉगिन पासवर्ड दर्ज करें',
    bank_added_success: 'बैंक खाता सफलतापूर्वक जोड़ा गया',
    bank_deleted_success: 'बैंक खाता हटा दिया गया',
    select_bank_withdraw: 'निकासी के लिए बैंक चुनें',
    enter_withdraw_amount: 'निकासी राशि दर्ज करें',
    min_withdraw: 'न्यूनतम निकासी: ₹100',

    // Support
    customer_service: 'कस्टमर केयर और AI सहायता',
    ai_assistant: 'AI सहायक',
    admin_live_chat: 'लाइव एडमिन चैट',
    type_message: 'अपना संदेश लिखें...',
    attach_media: 'फोटो/वीडियो जोड़ें',
    connected_to_admin: 'लाइव सपोर्ट टीम से जुड़े',
    escalated_to_admin: 'आपकी समस्या लाइव एडमिन टीम को भेज दी गई है',

    // Games
    bet_history: 'बेट इतिहास',
    my_bets: 'मेरी बेट्स',
    round_history: 'राउंड इतिहास',
    bet_amount: 'बेट राशि',
    multiplier: 'गुणांक (Multiplier)',
    payout: 'जीत राशि',
    cash_out: 'कैश आउट',
    start_game: 'गेम शुरू करें',
    mine_count: 'माइंस की संख्या',
    place_bet: 'बेट लगाएं',
    win: 'जीत',
    loss: 'हार',

    // Settings
    language_select: 'भाषा (Language)',
    hindi: 'हिंदी (Hindi)',
    english: 'English',
    sound: 'गेम साउंड',
    sound_effects: 'ध्वनि प्रभाव',
    notifications: 'सूचनाएं',
    app_version: 'ऐप वर्शन',
    logout: 'लॉग आउट',
    security_center: 'सुरक्षा केंद्र',
    bank_cards: 'बैंक कार्ड / UPI',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key, defaultText) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language');
      return (saved === 'hi' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    try {
      localStorage.setItem('app_language', lang);
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const enDict = translations.en;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
