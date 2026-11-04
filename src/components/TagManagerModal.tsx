import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, Tags } from 'lucide-react';
import { Tag } from '../types';
import { PRESET_COLORS } from '../lib/constants';
import { generateId } from '../lib/utils';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  onSaveTag: (tag: Tag) => void;
  onDeleteTag: (id: string) => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  tags,
  onSaveTag,
  onDeleteTag,
}) => {
  const [newTagName, setNewTagName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // Edit tag
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingColorIndex, setEditingColorIndex] = useState(0);

  if (!isOpen) return null;

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    const preset = PRESET_COLORS[selectedColorIndex];
    const newTag: Tag = {
      id: 'tag_' + generateId(),
      name: newTagName.trim(),
      color: preset.color,
      bgColor: preset.bgColor,
      textColor: preset.textColor,
      sortOrder: tags.length + 1,
    };

    onSaveTag(newTag);
    setNewTagName('');
  };

  const startEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    const colorIdx = PRESET_COLORS.findIndex((c) => c.color === tag.color);
    setEditingColorIndex(colorIdx >= 0 ? colorIdx : 0);
  };

  const saveEdit = (tag: Tag) => {
    if (!editingTagName.trim()) return;
    const preset = PRESET_COLORS[editingColorIndex];
    const updatedTag: Tag = {
      ...tag,
      name: editingTagName.trim(),
      color: preset.color,
      bgColor: preset.bgColor,
      textColor: preset.textColor,
    };
    onSaveTag(updatedTag);
    setEditingTagId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Tags className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">项目与习惯标签管理</h2>
              <p className="text-xs text-slate-400">设定标签名字与专属颜色，区分工作项目与个人生活</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Add Tag Section */}
          <form onSubmit={handleAddTag} className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
            <span className="text-xs font-semibold text-slate-700">添加新标签</span>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="例如: SPFR, GDA, 健身, 读书..."
                className="flex-1 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-medium rounded-lg shadow-2xs transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加</span>
              </button>
            </div>

            {/* Color Palette Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">选择色彩主题：</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c, idx) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setSelectedColorIndex(idx)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      selectedColorIndex === idx ? 'ring-2 ring-indigo-500 scale-125' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Live Preview */}
            {newTagName.trim() && (
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[11px] text-slate-400">预览效果：</span>
                <span
                  style={{
                    backgroundColor: PRESET_COLORS[selectedColorIndex].bgColor,
                    color: PRESET_COLORS[selectedColorIndex].textColor,
                    borderColor: PRESET_COLORS[selectedColorIndex].color + '40',
                  }}
                  className="text-xs font-semibold px-2 py-0.5 rounded-md border"
                >
                  {newTagName.trim()}
                </span>
              </div>
            )}
          </form>

          {/* Existing Tags List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700">已有标签库 ({tags.length})</span>
            <div className="space-y-1.5">
              {tags.map((tag) => {
                const isEditing = editingTagId === tag.id;

                if (isEditing) {
                  return (
                    <div
                      key={tag.id}
                      className="p-3 bg-indigo-50/40 border border-indigo-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => saveEdit(tag)}
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          title="保存"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTagId(null)}
                          className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                          title="取消"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Color switch in edit mode */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {PRESET_COLORS.map((c, idx) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setEditingColorIndex(idx)}
                            className={`w-4 h-4 rounded-full ${
                              editingColorIndex === idx ? 'ring-2 ring-indigo-500 scale-125' : ''
                            }`}
                            style={{ backgroundColor: c.color }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        style={{
                          backgroundColor: tag.bgColor || '#F1F5F9',
                          color: tag.textColor || tag.color,
                          borderColor: tag.color + '40',
                        }}
                        className="text-xs font-semibold px-2 py-0.5 rounded-md border"
                      >
                        {tag.name}
                      </span>
                      {tag.isDefault && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">预设</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => startEdit(tag)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="编辑标签"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTag(tag.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="删除标签"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-xl transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
