/**
 * コース情報の定義
 * 実際の実装では、データベースやAPIから取得します
 */

export interface Course {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  detailedDescription?: string;
}

export const COURSES: Course[] = [
  {
    id: 'basic-math',
    name: '基礎数学',
    description: '数学の基礎を学ぶコースです。代数、幾何、関数などの基本概念を理解します。',
    detailedDescription: 'このコースでは、数学の基礎的な概念を学びます。代数、幾何、関数、統計などの基本的なトピックをカバーし、実践的な問題解決スキルを身につけます。',
    price: 5000,
    category: '数学',
  },
  {
    id: 'programming',
    name: 'プログラミング入門',
    description: 'プログラミングの基礎を学ぶコースです。JavaScriptを使用して基本的なプログラムを作成します。',
    detailedDescription: 'このコースでは、プログラミングの基礎を学びます。変数、関数、制御構造、オブジェクト指向プログラミングなどの基本概念を理解し、JavaScriptを使用して実際のプログラムを作成します。',
    price: 8000,
    category: 'プログラミング',
  },
  {
    id: 'data-science',
    name: 'データサイエンス基礎',
    description: 'データ分析の基礎を学ぶコースです。Pythonを使用してデータを分析します。',
    detailedDescription: 'このコースでは、データサイエンスの基礎を学びます。データの収集、クリーニング、分析、可視化などの基本的なスキルを身につけ、Pythonを使用して実際のデータを分析します。',
    price: 10000,
    category: 'データサイエンス',
  },
  {
    id: 'web-development',
    name: 'Web開発',
    description: 'Webアプリケーションの開発を学ぶコースです。ReactとNext.jsを使用します。',
    detailedDescription: 'このコースでは、Webアプリケーションの開発を学びます。HTML、CSS、JavaScriptの基礎から始め、ReactとNext.jsを使用してモダンなWebアプリケーションを構築します。',
    price: 12000,
    category: 'Web開発',
  },
];

/**
 * コースIDからコース情報を取得
 */
export function getCourseById(courseId: string): Course | undefined {
  return COURSES.find(course => course.id === courseId);
}

/**
 * すべてのコースを取得
 */
export function getAllCourses(): Course[] {
  return COURSES;
}

