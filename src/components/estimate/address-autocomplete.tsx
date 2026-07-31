'use client';

import * as React from 'react';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * Address autocomplete backed by our own `/api/places/*` proxy.
 *
 * Deliberately does NOT use the Google Maps JavaScript SDK:
 *   - the API key stays on the server,
 *   - no map, tiles or geometry are ever loaded,
 *   - the page stays fast (no third-party script).
 */

export interface ResolvedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  formattedAddress: string;
}

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Fired once Google has expanded the selection into address components. */
  onAddressSelected: (address: ResolvedAddress) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

export function AddressAutocomplete({
  id = 'destination-search',
  value,
  onValueChange,
  onAddressSelected,
  onError,
  disabled,
  placeholder = 'Start typing your address…',
  ...aria
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const sessionTokenRef = React.useRef<string>(crypto.randomUUID());
  // Set while a suggestion is being applied, so the resulting value change does
  // not immediately trigger another search.
  const suppressSearchRef = React.useRef(false);

  // Close the dropdown when focus or the pointer leaves the component.
  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  // Debounced suggestion fetch; each keystroke aborts the previous request.
  React.useEffect(() => {
    if (suppressSearchRef.current) {
      suppressSearchRef.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          input: query,
          sessionToken: sessionTokenRef.current,
        });
        const response = await fetch(`/api/places/autocomplete?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('lookup failed');

        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setSuggestions([]);
          setOpen(false);
          // Autocomplete is a convenience; the manual fields still work, so we
          // surface this quietly rather than blocking the form.
          onError?.(
            'Address suggestions are unavailable. You can type the address manually.',
          );
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // `onError` is intentionally omitted: callers pass inline closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function selectSuggestion(suggestion: Suggestion) {
    suppressSearchRef.current = true;
    onValueChange(suggestion.description);
    setOpen(false);
    setSuggestions([]);
    setLoading(true);

    try {
      const params = new URLSearchParams({
        placeId: suggestion.placeId,
        sessionToken: sessionTokenRef.current,
      });
      const response = await fetch(`/api/places/details?${params}`);
      if (!response.ok) throw new Error('details failed');

      const data = (await response.json()) as { address?: ResolvedAddress };
      if (data.address) onAddressSelected(data.address);
    } catch {
      onError?.(
        "We couldn't load that address automatically. Please check the fields below.",
      );
    } finally {
      setLoading(false);
      // A new session token starts the next billing session with Google.
      sessionTokenRef.current = crypto.randomUUID();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeIndex];
      if (suggestion) void selectSuggestion(suggestion);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const listboxId = `${id}-listbox`;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          className="pl-9 pr-10"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          {...aria}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Spinner label="Searching addresses" />
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-50 mt-2 max-h-72 w-full animate-fade-in-up overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placeId}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                // Prevent the input blurring before the click registers.
                event.preventDefault();
                void selectSuggestion(suggestion);
              }}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                index === activeIndex ? 'bg-accent' : 'hover:bg-accent/60',
              )}
            >
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium">{suggestion.mainText}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {suggestion.secondaryText}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
