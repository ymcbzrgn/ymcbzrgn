/**
 * Settings App
 * Simplified system preferences - Wallpaper & Icon Size only
 */

import { useStore } from '../../os/store';
import { setLang, useLang, useT } from '../../os/i18n/full';
import './Settings.css';

interface SettingsProps {
  windowId: string;
  nodeId?: string;
}

type IconSizeOption = 'extra-small' | 'small' | 'medium' | 'large';

// Preset wallpapers (solid colors & gradients)
const WALLPAPER_PRESETS = [
  { id: 'ubuntu-purple', name: 'Ubuntu Purple', value: 'linear-gradient(135deg, #874DA7 0%, #C85C94 100%)' },
  { id: 'ubuntu-orange', name: 'Ubuntu Orange', value: 'linear-gradient(135deg, #DD4814 0%, #F69B14 100%)' },
  { id: 'dark-blue', name: 'Dark Blue', value: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' },
  { id: 'forest-green', name: 'Forest Green', value: 'linear-gradient(135deg, #064E3B 0%, #10B981 100%)' },
  { id: 'sunset', name: 'Sunset', value: 'linear-gradient(135deg, #7C2D12 0%, #F97316 50%, #FCD34D 100%)' },
  { id: 'ocean', name: 'Ocean', value: 'linear-gradient(135deg, #0C4A6E 0%, #0EA5E9 50%, #7DD3FC 100%)' },
  { id: 'noir', name: 'Noir', value: '#1a1a1a' },
  { id: 'charcoal', name: 'Charcoal', value: '#2d2d2d' },
  { id: 'slate', name: 'Slate', value: '#334155' },
  { id: 'navy', name: 'Navy', value: '#1E293B' },
  { id: 'burgundy', name: 'Burgundy', value: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)' },
  { id: 'royal', name: 'Royal Purple', value: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)' },
];

export default function Settings({ windowId }: SettingsProps) {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const t = useT();
  const lang = useLang();

  // Wallpaper change handler
  const handleWallpaperChange = (wallpaper: string) => {
    updateSettings({ wallpaper });
  };

  // Icon size change handler
  const handleIconSizeChange = (iconSize: IconSizeOption) => {
    updateSettings({ iconSize });
  };

  return (
    <div className="settings-app">
      <div className="settings-app__content">
        <div className="settings-app__section">
          {/* Wallpaper Picker */}
          <div className="settings-app__group">
            <h3 className="settings-app__group-title">Wallpaper</h3>
            <p className="settings-app__group-description">
              Choose your desktop background
            </p>
            <div className="settings-app__wallpaper-grid">
              {WALLPAPER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`settings-app__wallpaper-option ${
                    settings.wallpaper === preset.value ? 'settings-app__wallpaper-option--active' : ''
                  }`}
                  style={{ background: preset.value }}
                  onClick={() => handleWallpaperChange(preset.value)}
                  title={preset.name}
                  aria-label={`Select ${preset.name} wallpaper`}
                />
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="settings-app__group">
            <h3 className="settings-app__group-title">{t('setLanguage')}</h3>
            <div className="settings-app__radio-group">
              <label className="settings-app__radio">
                <input type="radio" name="lang" checked={lang === 'en'} onChange={() => setLang('en')} />
                <span>English</span>
              </label>
              <label className="settings-app__radio">
                <input type="radio" name="lang" checked={lang === 'tr'} onChange={() => setLang('tr')} />
                <span>Türkçe</span>
              </label>
            </div>
          </div>

          {/* Desktop extras */}
          <div className="settings-app__group">
            <div className="settings-app__radio-group">
              <label className="settings-app__radio">
                <input
                  type="checkbox"
                  checked={!settings.widgetHidden}
                  onChange={(e) => updateSettings({ widgetHidden: !e.target.checked })}
                />
                <span>{t('setWidget')}</span>
                <small className="settings-app__radio-hint">{t('setWidgetHint')}</small>
              </label>
              <label className="settings-app__radio">
                <input
                  type="checkbox"
                  checked={!settings.assistantHidden}
                  onChange={(e) => updateSettings({ assistantHidden: !e.target.checked })}
                />
                <span>{t('setAssistant')}</span>
                <small className="settings-app__radio-hint">{t('setAssistantHint')}</small>
              </label>
            </div>
          </div>

          {/* Icon Size Picker */}
          <div className="settings-app__group">
            <h3 className="settings-app__group-title">Icon Size</h3>
            <p className="settings-app__group-description">
              Adjust desktop icon size
            </p>
            <div className="settings-app__radio-group">
              <label className="settings-app__radio">
                <input
                  type="radio"
                  name="iconSize"
                  value="extra-small"
                  checked={settings.iconSize === 'extra-small'}
                  onChange={() => handleIconSizeChange('extra-small')}
                />
                <span>Extra Small</span>
                <small className="settings-app__radio-hint">60px × 60px</small>
              </label>
              <label className="settings-app__radio">
                <input
                  type="radio"
                  name="iconSize"
                  value="small"
                  checked={settings.iconSize === 'small'}
                  onChange={() => handleIconSizeChange('small')}
                />
                <span>Small</span>
                <small className="settings-app__radio-hint">80px × 80px (default)</small>
              </label>
              <label className="settings-app__radio">
                <input
                  type="radio"
                  name="iconSize"
                  value="medium"
                  checked={settings.iconSize === 'medium'}
                  onChange={() => handleIconSizeChange('medium')}
                />
                <span>Medium</span>
                <small className="settings-app__radio-hint">100px × 100px</small>
              </label>
              <label className="settings-app__radio">
                <input
                  type="radio"
                  name="iconSize"
                  value="large"
                  checked={settings.iconSize === 'large'}
                  onChange={() => handleIconSizeChange('large')}
                />
                <span>Large</span>
                <small className="settings-app__radio-hint">120px × 120px</small>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
