# 🤝 Contributing to POS Retail Shop

ขอบคุณที่สนใจมีส่วนร่วมในการพัฒนาระบบ POS Retail Shop! คู่มือนี้จะแนะนำขั้นตอนการมีส่วนร่วมในโปรเจคอย่างมีประสิทธิภาพ

## 📋 สารบัญ

- [วิธีการมีส่วนร่วม](#วิธีการมีส่วนร่วม)
- [การตั้งค่า Development Environment](#การตั้งค่า-development-environment)
- [Code Style และ Standards](#code-style-และ-standards)
- [การส่ง Pull Request](#การส่ง-pull-request)
- [การรายงาน Issues](#การรายงาน-issues)
- [Community Guidelines](#community-guidelines)
- [การทดสอบ](#การทดสอบ)
- [Documentation](#documentation)

---

## 🎯 วิธีการมีส่วนร่วม

### 🔰 สำหรับผู้เริ่มต้น

1. **🍴 Fork Repository**
   ```bash
   # ไปที่ https://github.com/yourusername/pos-retail-shop
   # คลิก Fork button
   ```

2. **📥 Clone Fork ของคุณ**
   ```bash
   git clone https://github.com/your-username/pos-retail-shop.git
   cd pos-retail-shop
   ```

3. **⚙️ ติดตั้ง Dependencies**
   ```bash
   pnpm install
   cp .env.example .env.local
   # แก้ไข environment variables ใน .env.local
   ```

4. **🔧 เริ่ม Development Server**
   ```bash
   pnpm dev
   ```

### 🌟 ประเภทของการมีส่วนร่วม

#### 🐛 Bug Fixes
- แก้ไขปัญหาที่พบในระบบ
- ปรับปรุง error handling
- แก้ไขปัญหาความปลอดภัย

#### ✨ New Features  
- เพิ่มฟีเจอร์ใหม่ตามที่ร้องขอ
- ปรับปรุงประสบการณ์ผู้ใช้ (UX)
- เพิ่ม integration กับระบบอื่น

#### 📚 Documentation
- ปรับปรุงคู่มือการใช้งาน
- เพิ่ม code comments
- แปลเอกสารเป็นภาษาอื่น

#### 🧪 Testing
- เพิ่ม unit tests
- เพิ่ม integration tests
- ปรับปรุง test coverage

#### 🎨 UI/UX
- ปรับปรุงการออกแบบ
- เพิ่มการ responsive
- ปรับปรุง accessibility

---

## 💻 การตั้งค่า Development Environment

### ความต้องการของระบบ

- **Node.js** v18.0.0 หรือสูงกว่า
- **pnpm** v8.0.0 หรือสูงกว่า (แนะนำ)
- **Git** v2.30.0 หรือสูงกว่า
- **VS Code** (แนะนำ) พร้อม extensions

### 🛠️ ขั้นตอนการตั้งค่า

1. **Clone และ Setup**
   ```bash
   git clone https://github.com/your-username/pos-retail-shop.git
   cd pos-retail-shop
   pnpm install
   ```

2. **Database Setup**
   ```bash
   # สร้าง Supabase project ใหม่
   # หรือใช้ local PostgreSQL
   
   # Copy environment file
   cp .env.example .env.local
   
   # แก้ไข database credentials
   nano .env.local
   ```

3. **การตั้งค่า VS Code**
   
   ติดตั้ง Extensions ที่แนะนำ:
   ```json
   {
     "recommendations": [
       "bradlc.vscode-tailwindcss",
       "esbenp.prettier-vscode", 
       "ms-vscode.vscode-typescript-next",
       "ms-vscode.vscode-json",
       "formulahendry.auto-rename-tag",
       "christian-kohler.path-intellisense"
     ]
   }
   ```

4. **Git Hooks Setup**
   ```bash
   # ติดตั้ง Husky สำหรับ pre-commit hooks
   pnpm prepare
   ```

### 🎯 Branch Strategy

```bash
# สร้าง feature branch
git checkout -b feature/your-feature-name

# สร้าง bug fix branch  
git checkout -b fix/issue-description

# สร้าง documentation branch
git checkout -b docs/improvement-description

# สร้าง chore branch
git checkout -b chore/maintenance-task
```

---

## 📋 Code Style และ Standards

### 🎨 Code Formatting

โปรเจคใช้ **Prettier** และ **ESLint** สำหรับ formatting:

```bash
# Format code
pnpm format

# Lint code  
pnpm lint

# Fix lint issues
pnpm lint:fix

# Type check
pnpm type-check
```

### 📝 Naming Conventions

#### Files และ Folders
```
components/       # React components
├── ui/          # UI components (shadcn/ui)
├── charts/      # Chart components
└── forms/       # Form components

hooks/           # Custom React hooks
lib/             # Utilities และ helpers
types/           # TypeScript type definitions
```

#### Code Conventions
```typescript
// ✅ Good
const UserProfile = () => {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (data: FormData) => {
    // implementation
  }
  
  return <div>...</div>
}

// ✅ Good - Custom hooks
const useUserData = () => {
  // implementation
}

// ✅ Good - Utils
export const formatCurrency = (amount: number): string => {
  // implementation
}

// ❌ Bad - ไม่ใช้ camelCase
const user_profile = () => {}
const Handle_Submit = () => {}
```

### 🔒 TypeScript Standards

```typescript
// ✅ Always use proper types
interface PriceData {
  id: string
  product_name: string
  price: number
  category: string
  date: Date
}

// ✅ Use generics when appropriate
const fetchData = async <T>(endpoint: string): Promise<T> => {
  // implementation
}

// ❌ Avoid 'any' type
const data: any = await fetchData()
```

### 🎯 Component Structure

```tsx
// ✅ Recommended component structure
interface ComponentProps {
  // Props interface
}

export const Component: React.FC<ComponentProps> = ({
  // Props destructuring
}) => {
  // Hooks
  const [state, setState] = useState()
  
  // Effects
  useEffect(() => {
    // Side effects
  }, [])
  
  // Handlers
  const handleAction = useCallback(() => {
    // Handler implementation
  }, [])
  
  // Early returns
  if (loading) return <Loading />
  
  // Main render
  return (
    <div className="component-wrapper">
      {/* JSX */}
    </div>
  )
}
```

---

## 🚀 การส่ง Pull Request

### 📋 Pre-Submit Checklist

ก่อนส่ง PR ให้ตรวจสอบ:

- [ ] ✅ Code ผ่าน linting (`pnpm lint`)
- [ ] ✅ Code ผ่าน type checking (`pnpm type-check`)
- [ ] ✅ Tests ผ่านหมด (`pnpm test`)
- [ ] ✅ Build สำเร็จ (`pnpm build`)
- [ ] ✅ เทสใน browser (manual testing)
- [ ] ✅ Documentation อัพเดทแล้ว (ถ้าจำเป็น)
- [ ] ✅ Screenshots/GIFs สำหรับ UI changes

### 📝 PR Template

```markdown
## 📋 Description
Brief description ของการเปลี่ยนแปลง

## 🎯 Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change
- [ ] 📚 Documentation update
- [ ] 🎨 Style/UI changes
- [ ] 🔧 Refactor
- [ ] ⚡ Performance improvement

## 🧪 Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing

## 📷 Screenshots (ถ้าเป็น UI changes)
Before:
[Screenshot]

After: 
[Screenshot]

## 📋 Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### 🔄 PR Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Commit Changes**
   ```bash
   # ใช้ conventional commit format
   git commit -m "feat: add amazing new feature
   
   - Add new component for user management
   - Update API endpoints
   - Add tests for new functionality
   
   Closes #123"
   ```

3. **Push to Fork**
   ```bash
   git push origin feature/amazing-feature
   ```

4. **Create Pull Request**
   - ไปที่ GitHub repository
   - คลิก "New Pull Request"
   - กรอกข้อมูลตาม template
   - Add reviewers และ labels

### ✅ Commit Message Format

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     # ฟีเจอร์ใหม่
fix:      # bug fix
docs:     # เอกสาร
style:    # formatting, white-space
refactor: # code refactoring
test:     # การเพิ่ม/แก้ไข tests
chore:    # maintenance tasks

# Examples:
feat(dashboard): add real-time sales chart
fix(inventory): resolve stock calculation bug
docs(api): update endpoint documentation
style(ui): improve button hover states
```

---

## 🐛 การรายงาน Issues

### 🎯 ประเภท Issues

#### 🐛 Bug Report
```markdown
## 🐛 Bug Description
ให้รายละเอียดปัญหาที่พบ

## 📋 Steps to Reproduce
1. ไปที่หน้า...
2. คลิกที่...
3. ดูผลลัพธ์...

## 💻 Environment
- Browser: Chrome 120.0
- OS: Windows 11
- Screen: Desktop/Mobile
- Version: v1.2.0

## 📷 Screenshots
[Attach screenshots]

## 🎯 Expected Behavior
อธิบายสิ่งที่คาดหวัง

## 🔍 Additional Context
ข้อมูลเพิ่มเติม
```

#### ✨ Feature Request
```markdown
## ✨ Feature Description
อธิบายฟีเจอร์ที่ต้องการ

## 💡 Problem it Solves
ปัญหาที่ฟีเจอร์นี้จะแก้ไข

## 🎯 Proposed Solution
วิธีการที่เสนอ

## 🔄 Alternative Solutions
วิธีการอื่นๆ ที่พิจารณาแล้ว

## 📷 Mockups/Examples
[Attach mockups or examples]
```

### 🏷️ Issue Labels

- 🐛 `bug` - ปัญหาในระบบ
- ✨ `enhancement` - ฟีเจอร์ใหม่
- 📚 `documentation` - เอกสาร
- 🆘 `help wanted` - ต้องการความช่วยเหลือ
- 🔰 `good first issue` - เหมาะสำหรับผู้เริ่มต้น
- ❗ `priority: high` - ความสำคัญสูง
- ⚡ `priority: medium` - ความสำคัญปานกลาง
- 🔵 `priority: low` - ความสำคัญต่ำ

---

## 🧪 การทดสอบ

### 🎯 ประเภทการทดสอบ

#### Unit Tests
```bash
# รัน unit tests
pnpm test

# รัน tests แบบ watch mode
pnpm test:watch  

# ดู test coverage
pnpm test:coverage
```

#### Integration Tests
```bash
# รัน integration tests
pnpm test:integration

# รัน E2E tests
pnpm test:e2e
```

#### Manual Testing
```bash
# เทสใน development
pnpm dev

# เทสใน production build
pnpm build
pnpm start
```

### ✍️ การเขียน Tests

```typescript
// ✅ Good test example
describe('PriceCalculator', () => {
  it('should calculate total price correctly', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 15, quantity: 1 }
    ]
    
    const total = calculateTotal(items)
    
    expect(total).toBe(35)
  })
  
  it('should handle empty array', () => {
    const total = calculateTotal([])
    expect(total).toBe(0)
  })
})
```

### 📱 Cross-Platform Testing

#### Browser Compatibility
- ✅ Chrome (latest 2 versions)
- ✅ Firefox (latest 2 versions)  
- ✅ Safari (latest 2 versions)
- ✅ Edge (latest 2 versions)

#### Device Testing
- 📱 Mobile (iOS Safari, Android Chrome)
- 💻 Desktop (1920x1080, 1366x768)
- 📟 Tablet (iPad, Android tablets)

---

## 📚 Documentation

### 📝 Code Documentation

```typescript
/**
 * คำนวณราคารวมจากรายการสินค้า
 * @param items - รายการสินค้าที่ต้องการคำนวณ
 * @returns ราคารวมทั้งหมด
 * @example
 * ```typescript
 * const total = calculateTotal([
 *   { price: 10, quantity: 2 },
 *   { price: 15, quantity: 1 }
 * ])
 * // returns 35
 * ```
 */
export const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
}
```

### 📖 API Documentation

```typescript
/**
 * POST /api/prices
 * 
 * เพิ่มข้อมูลราคาใหม่
 * 
 * @body {
 *   product_name: string
 *   price: number
 *   category: string
 *   date?: string
 * }
 * 
 * @returns {
 *   success: boolean
 *   data: PriceData
 * }
 */
```

### 📋 Changelog Updates

เมื่อมีการเปลี่ยนแปลงสำคัญ ให้อัพเดท CHANGELOG.md:

```markdown
## [1.2.0] - 2024-01-15

### ✨ Added
- Real-time inventory tracking
- Advanced search with filters
- Keyboard shortcuts system

### 🐛 Fixed
- Fix calculation bug in total price
- Resolve mobile layout issues
- Fix print system compatibility

### 📚 Documentation
- Add troubleshooting guide
- Update API documentation
- Improve user manual
```

---

## 🤝 Community Guidelines

### 💬 การสื่อสار

#### ในระบบ GitHub
- ใช้ภาษาไทยหรือภาษาอังกฤษ
- เป็นมิตรและให้เกียรติกัน
- ให้ข้อมูลที่ชัดเจนและเป็นประโยชน์

#### ใน Discord/Community
- **#general** - สนทนาทั่วไป
- **#development** - พูดคุยเรื่องการพัฒนา
- **#bugs** - รายงานปัญหา
- **#features** - เสนอฟีเจอร์ใหม่

### 🌟 Recognition

#### Contributors Hall of Fame
ผู้มีส่วนร่วมที่โดดเด่นจะได้รับการยกย่อง:
- 🏆 **Top Contributors** - บน README.md
- 🎖️ **Release Notes** - กล่าวถึงใน changelog
- ✨ **Special Thanks** - ใน documentation

#### Contribution Levels
- 🔰 **New Contributor** (1-5 PRs)
- ⭐ **Regular Contributor** (6-15 PRs)
- 🌟 **Core Contributor** (16-30 PRs)
- 🏆 **Maintainer** (31+ PRs หรือได้รับเชิญ)

---

## 🚀 Advanced Contribution

### 🔧 Development Tools

#### Recommended Setup
```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build", 
    "test": "jest --watch",
    "lint": "next lint",
    "format": "prettier --write ."
  }
}
```

#### Git Flow
```bash
# Feature development
git flow feature start new-feature
# ... development work
git flow feature finish new-feature

# Release preparation  
git flow release start 1.2.0
# ... version updates
git flow release finish 1.2.0

# Hotfix
git flow hotfix start urgent-fix
# ... fix implementation  
git flow hotfix finish urgent-fix
```

### 🎯 Becoming a Maintainer

#### Criteria
1. **Consistent contributions** (3+ months)
2. **Code quality** และ adherence to standards  
3. **Community involvement** (helping others)
4. **Technical expertise** ในส่วนต่างๆ ของระบบ

#### Responsibilities
- 🔍 **Code reviews** สำหรับ PRs
- 🐛 **Issue triaging** และ bug investigation
- 📋 **Release planning** และ version management
- 🆘 **Community support** และ mentoring

---

## 📞 การขอความช่วยเหลือ

### 🤔 มีคำถาม?

1. **📖 ตรวจสอบเอกสาร**: README, docs/, wiki
2. **🔍 ค้นหา issues**: อาจมีคนถามไปแล้ว
3. **💬 ถาม community**: Discord, discussions
4. **📧 ติดต่อ maintainers**: สำหรับเรื่องส่วนตัว

### 📧 Contact Information

- **Email**: contribute@yourstore.com
- **Discord**: https://discord.gg/yourstore-dev
- **GitHub Discussions**: Use for Q&A
- **Twitter**: @yourstore_dev

---

<div align=\"center\">

## 🙏 ขอบคุณสำหรับการมีส่วนร่วม!

**ความช่วยเหลือของคุณทำให้ POS Retail Shop ดีขึ้นสำหรับเจ้าของร้านค้าไทยทุกคน**

### 🌟 ข้อมูลอื่นๆ

📖 [Documentation](./docs/) | 🐛 [Issues](https://github.com/yourusername/pos-retail-shop/issues) | 💬 [Discussions](https://github.com/yourusername/pos-retail-shop/discussions)

**Happy Contributing!** 🚀

</div>