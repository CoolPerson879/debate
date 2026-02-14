'use client'

import { useRef, useState } from 'react'
import './editor.css'

export default function TextEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState('3')  // 3 = 12pt
  const [colors, setColors] = useState(['#000000', '#FF0000', '#00B050', '#0070C0', '#FFD966', '#FF6B6B', '#4ECDC4', '#95E1D3'])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropPosition, setDropPosition] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null)
  const [cCounter, setCCounter] = useState(1)
  const [iCounter, setICounter] = useState(1)
  const [justInsertedSnippet, setJustInsertedSnippet] = useState(false)
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    insertUnorderedList: false,
    insertOrderedList: false
  })

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikethrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList')
    })
  }

  const applyStyle = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    setTimeout(updateActiveFormats, 0)
  }

  const applyHeading = (level: number) => {
    if (level === 0) {
      document.execCommand('formatBlock', false, '<p>')
    } else {
      document.execCommand('formatBlock', false, `<h${level}>`)
    }
    editorRef.current?.focus()
  }

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontName = e.target.value
    setFontFamily(fontName)
    editorRef.current?.focus()
    
    // Always apply font, with or without selection
    document.execCommand('fontName', false, fontName)
  }

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value
    setFontSize(size)
    editorRef.current?.focus()
    document.execCommand('fontSize', false, size)  // size is numeric: 1-7
  }

  const handleColorSelect = (color: string, index?: number) => {
    editorRef.current?.focus()
    applyStyle('foreColor', color)
    if (index !== undefined) {
      setActiveColorIndex(index)
    }
  }

  const insertSnippet = (text: string) => {
    editorRef.current?.focus()
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      
      // Check if there's already text on the current line
      let currentNode = range.startContainer
      let hasTextOnLine = false
      
      // Navigate to parent element to check for content
      if (currentNode.nodeType === Node.TEXT_NODE) {
        currentNode = currentNode.parentNode as Node
      }
      
      // Check if there's any text content in the current block
      const textContent = (currentNode as HTMLElement).textContent || ''
      hasTextOnLine = textContent.trim().length > 0
      
      // If there's text, insert a line break first
      if (hasTextOnLine) {
        const br = document.createElement('br')
        range.insertNode(br)
        range.setStartAfter(br)
        range.setEndAfter(br)
      }
      
      // Create and insert the formatted snippet
      const span = document.createElement('span')
      span.style.fontWeight = 'bold'
      span.style.fontSize = '20pt'
      span.textContent = text
      
      range.deleteContents()
      range.insertNode(span)
      
      // Move cursor after the inserted text
      range.setStartAfter(span)
      range.setEndAfter(span)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    
    setJustInsertedSnippet(true)
    editorRef.current?.focus()
  }

  const changeFontSizeBy = (delta: number) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    if (range.collapsed) return // No selection
    
    const span = document.createElement('span')
    const contents = range.extractContents()
    span.appendChild(contents)
    
    // Get current font size or use default 16pt
    const computedStyle = window.getComputedStyle(span)
    const currentSize = parseFloat(computedStyle.fontSize) || 16
    const currentPt = currentSize * 0.75 // Convert px to pt
    const newPt = Math.max(8, Math.min(72, currentPt + delta)) // Clamp between 8pt and 72pt
    
    span.style.fontSize = `${newPt}pt`
    range.insertNode(span)
    
    // Restore selection
    selection.removeAllRanges()
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    selection.addRange(newRange)
    
    editorRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Tab key - create new line with all formatting removed
    if (e.key === 'Tab') {
      e.preventDefault()
      
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        
        // Insert a line break
        const br = document.createElement('br')
        range.insertNode(br)
        
        // Create a new span with explicitly cleared formatting
        const span = document.createElement('span')
        span.style.fontWeight = 'normal'
        span.style.textDecoration = 'none'
        span.style.fontStyle = 'normal'
        span.style.fontSize = '15pt'
        span.innerHTML = '&nbsp;'
        
        range.setStartAfter(br)
        range.insertNode(span)
        
        // Move cursor into the span and collapse to start
        range.setStart(span.firstChild!, 1)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        
        // Force remove any active formatting commands
        setTimeout(() => {
          document.execCommand('removeFormat', false, '')
          document.execCommand('formatBlock', false, '<p>')
        }, 0)
      }
      
      setJustInsertedSnippet(false)
      editorRef.current?.focus()
      return
    }
    
    // Check for Ctrl (Windows/Linux) or Cmd (Mac)
    if (e.ctrlKey || e.metaKey) {
      if (e.shiftKey) {
        // Shift + Ctrl/Cmd combinations
        if (e.key === ',') {
          e.preventDefault()
          changeFontSizeBy(-1)
        } else if (e.key === '.') {
          e.preventDefault()
          changeFontSizeBy(1)
        } else if (e.key === 'J' || e.key === 'j') {
          e.preventDefault()
          handleColorSelect(colors[0], 0)
        } else if (e.key === 'K' || e.key === 'k') {
          e.preventDefault()
          handleColorSelect(colors[1], 1)
        }
      } else {
        // Regular Ctrl/Cmd combinations
        if (e.key === 'b') {
          e.preventDefault()
          applyStyle('bold')
        } else if (e.key === 'i') {
          e.preventDefault()
          applyStyle('italic')
        } else if (e.key === 'u') {
          e.preventDefault()
          applyStyle('underline')
        } else if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          setZoomLevel(prev => Math.min(prev + 10, 200))
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          setZoomLevel(prev => Math.max(prev - 10, 50))
        } else if (e.key === '0') {
          e.preventDefault()
          setZoomLevel(100)
        }
      }
    }
  }

  const moveColor = (index: number, direction: 'up' | 'down') => {
    const newColors = [...colors]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newColors.length) return
    [newColors[index], newColors[newIndex]] = [newColors[newIndex], newColors[index]]
    setColors(newColors)
  }

  const updateColor = (index: number, value: string) => {
    const newColors = [...colors]
    newColors[index] = value
    setColors(newColors)
    setEditingIndex(null)
  }

  const startEditing = (index: number) => {
    setEditingIndex(index)
    // Trigger the color input click
    setTimeout(() => colorInputRef.current?.click(), 0)
  }

  const handleColorInputChange = (index: number, value: string) => {
    updateColor(index, value)
  }

  const handleMouseDown = (index: number) => {
    // Clear any existing timeout
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current)
    
    // Set a timeout for long press (500ms)
    holdTimeoutRef.current = setTimeout(() => {
      startEditing(index)
    }, 500)
  }

  const handleMouseUp = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }

  const handleDragStart = (index: number, e: React.DragEvent) => {
    // Cancel edit if dragging starts
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    
    // Create a custom drag image
    const dragImage = document.createElement('div')
    dragImage.style.width = '32px'
    dragImage.style.height = '32px'
    dragImage.style.backgroundColor = colors[index]
    dragImage.style.borderRadius = '4px'
    dragImage.style.position = 'fixed'
    dragImage.style.pointerEvents = 'none'
    dragImage.style.border = '2px solid #000'
    document.body.appendChild(dragImage)
    
    e.dataTransfer?.setDragImage(dragImage, 16, 16)
    
    setTimeout(() => document.body.removeChild(dragImage), 0)
    
    setDraggedIndex(index)
    setDropPosition(null)
    e.dataTransfer!.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropPosition(index)
  }

  const handleDragLeave = () => {
    setDropPosition(null)
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDropPosition(null)
      return
    }

    const newColors = [...colors]
    const draggedColor = newColors[draggedIndex]
    newColors.splice(draggedIndex, 1)
    newColors.splice(index, 0, draggedColor)
    setColors(newColors)
    setDraggedIndex(null)
    setDropPosition(null)
  }

  return (
    <div className="editor-container">
      <div className="editor-wrapper">
        <div className="toolbar">
          <div className="toolbar-group">
            <select value={fontSize} onChange={handleFontSizeChange} className="toolbar-select">
              <option value="3">12pt</option>
              <option value="5">17pt</option>
              <option value="6">20pt</option>
            </select>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button
              title="Bold (Ctrl+B)"
              onClick={() => applyStyle('bold')}
              className={`toolbar-btn ${activeFormats.bold ? 'active' : ''}`}
            >
              <strong>B</strong>
            </button>
            <button
              title="Italic (Ctrl+I)"
              onClick={() => applyStyle('italic')}
              className={`toolbar-btn ${activeFormats.italic ? 'active' : ''}`}
            >
              <em>I</em>
            </button>
            <button
              title="Underline (Ctrl+U)"
              onClick={() => applyStyle('underline')}
              className={`toolbar-btn ${activeFormats.underline ? 'active' : ''}`}
            >
              <u>U</u>
            </button>
            <button
              title="Strikethrough"
              onClick={() => applyStyle('strikethrough')}
              className={`toolbar-btn ${activeFormats.strikethrough ? 'active' : ''}`}
            >
              <s>S</s>
            </button>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button
              title="Heading 1"
              onClick={() => applyHeading(1)}
              className="toolbar-btn"
            >
              H1
            </button>
            <button
              title="Heading 2"
              onClick={() => applyHeading(2)}
              className="toolbar-btn"
            >
              H2
            </button>
            <button
              title="Heading 3"
              onClick={() => applyHeading(3)}
              className="toolbar-btn"
            >
              H3
            </button>
            <button
              title="Paragraph"
              onClick={() => applyHeading(0)}
              className="toolbar-btn"
            >
              P
            </button>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button
              title="Bullet List"
              onClick={() => applyStyle('insertUnorderedList')}
              className={`toolbar-btn ${activeFormats.insertUnorderedList ? 'active' : ''}`}
            >
              •
            </button>
            <button
              title="Numbered List"
              onClick={() => applyStyle('insertOrderedList')}
              className={`toolbar-btn ${activeFormats.insertOrderedList ? 'active' : ''}`}
            >
              ≡
            </button>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button
              title="Insert V:"
              onClick={() => insertSnippet('V: ')}
              className="toolbar-btn"
            >
              V
            </button>
            <button
              title="Insert VC:"
              onClick={() => insertSnippet('VC: ')}
              className="toolbar-btn"
            >
              VC
            </button>
            <button
              title="Insert C#:"
              onClick={() => {
                insertSnippet(`C${cCounter}: `)
                setCCounter(prev => prev + 1)
              }}
              className="toolbar-btn"
            >
              C
            </button>
            <button
              title="Insert I#:"
              onClick={() => {
                insertSnippet(`I${iCounter}: `)
                setICounter(prev => prev + 1)
              }}
              className="toolbar-btn"
            >
              I
            </button>
          </div>
        </div>

        <div
          ref={editorRef}
          contentEditable
          className="editor-content"
          suppressContentEditableWarning
          onInput={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onKeyUp={updateActiveFormats}
          onKeyDown={handleKeyDown}
          style={{ zoom: `${zoomLevel}%` }}
        >
          <h1>Welcome to Your Text Editor</h1>
          <p>Start typing to create your document...</p>
        </div>

        <div className="color-panel">
          <div className="color-grid">
            {dropPosition !== null && draggedIndex !== null && (
              <div 
                className="drop-indicator" 
                style={{ top: `calc(${dropPosition} * (32px + 8px) - 4px)` }}
              />
            )}
            {colors.map((color, index) => (
              <div
                key={index}
                className={`color-item ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(index)}
                onMouseDown={() => handleMouseDown(index)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {editingIndex === index ? (
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={color}
                    onChange={(e) => handleColorInputChange(index, e.target.value)}
                    onBlur={() => setEditingIndex(null)}
                    className="color-picker-input"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => handleColorSelect(color, index)}
                    className={`toolbar-color-btn ${activeColorIndex === index ? 'active-color' : ''}`}
                    style={{ backgroundColor: color }}
                    title={`Click to apply | Hold to edit | Drag to reorder`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
