import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { UiStore } from '@store/ui.store';

import { environment } from '../../../environments/environment';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MapMarker extends MapPoint {
  id: number;
  label: string;
  sublabel?: string | null;
  /** Shown faded with a dashed edge: the point is a governorate centre. */
  approximate?: boolean;
}

/** Whole country, used until there is something to frame. */
const TUNISIA = L.latLngBounds([30.2, 7.5], [37.55, 11.6]);

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/**
 * Leaflet map of Tunisia. Marker labels are user content, so they are escaped before going
 * into the pin HTML. With `pickable`, a click or a drag moves `pin` and emits `picked`.
 */
@Component({
  selector: 'app-map',
  template: '<div #canvas class="size-full"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // isolate: Leaflet's panes and controls use z-index 400-1000; kept inside the map they no
  // longer cover the sticky header or its menus.
  host: {
    class: 'isolate block overflow-hidden',
    '[attr.aria-label]': '"Carte"',
    role: 'region',
  },
})
export class AppMap {
  readonly markers = input<MapMarker[]>([]);
  readonly activeId = input<number | null>(null);
  /** The visitor's position (blue dot). */
  readonly me = input<MapPoint | null>(null);
  readonly pickable = input(false);
  readonly pin = input<MapPoint | null>(null);
  readonly markerClick = output<number>();
  readonly picked = output<MapPoint>();

  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private readonly ui = inject(UiStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  private map: L.Map | null = null;
  private tiles: L.TileLayer | null = null;
  private readonly layer = L.layerGroup();
  private pinMarker: L.Marker | null = null;
  private framedKey = '';
  private wasSized = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const map = L.map(this.canvas().nativeElement, {
        zoomControl: false,
        attributionControl: true,
      });
      L.control.zoom({ position: 'topright' }).addTo(map);
      map.fitBounds(TUNISIA);
      this.layer.addTo(map);
      map.on('click', (event: L.LeafletMouseEvent) => {
        if (this.pickable())
          this.picked.emit({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
      this.map = map;
      this.applyTiles(untracked(() => this.ui.theme()));
      this.draw();
      this.drawPin();
      // Frame again once the container really has a size (it can be 0 while the page lays out).
      const observer = new ResizeObserver(() => {
        const sized = this.canvas().nativeElement.clientWidth > 0;
        map.invalidateSize();
        if (sized && !this.wasSized) {
          this.framedKey = '';
          this.draw();
          const pin = this.pickable() ? this.pin() : null;
          if (pin) map.setView([pin.latitude, pin.longitude], 15);
        }
        this.wasSized = sized;
      });
      observer.observe(this.canvas().nativeElement);
      destroyRef.onDestroy(() => {
        observer.disconnect();
        map.remove();
      });
    });

    effect(() => this.applyTiles(this.ui.theme()));
    effect(() => {
      this.markers();
      this.activeId();
      this.me();
      this.draw();
    });
    effect(() => {
      this.pin();
      this.drawPin();
    });
  }

  /** One tile set for both themes; dark mode inverts it in CSS (.ac-map--dark in styles.css). */
  private applyTiles(theme: 'light' | 'dark'): void {
    this.host.nativeElement.classList.toggle('ac-map--dark', theme === 'dark');
    if (!this.map || this.tiles) return;
    this.tiles = L.tileLayer(environment.mapTiles.url, {
      attribution: environment.mapTiles.attribution,
      maxZoom: 19,
    }).addTo(this.map);
  }

  private draw(): void {
    const map = this.map;
    if (!map) return;
    this.layer.clearLayers();
    const markers = this.markers();
    const active = this.activeId();
    for (const marker of markers.filter(
      (m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude),
    )) {
      const classes = [
        'ac-pin',
        marker.id === active ? 'ac-pin--active' : '',
        marker.approximate ? 'ac-pin--approx' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const html =
        `<div class="${classes}"><span>${escapeHtml(marker.label)}</span>` +
        (marker.sublabel ? `<small>${escapeHtml(marker.sublabel)}</small>` : '') +
        '</div>';
      L.marker([marker.latitude, marker.longitude], {
        icon: L.divIcon({ className: 'ac-pin-host', html, iconSize: [0, 0] }),
        zIndexOffset: marker.id === active ? 1000 : 0,
        keyboard: true,
        title: marker.label,
      })
        .on('click', () => this.markerClick.emit(marker.id))
        .addTo(this.layer);
    }
    const raw = this.me();
    const me = raw && Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude) ? raw : null;
    if (me) {
      L.marker([me.latitude, me.longitude], {
        icon: L.divIcon({
          className: 'ac-pin-host',
          html: '<div class="ac-me"></div>',
          iconSize: [0, 0],
        }),
        interactive: false,
      }).addTo(this.layer);
    }
    // Reframe only when the set of points changes, not when a pin is highlighted.
    const key =
      markers.map((m) => m.id).join(',') + '|' + (me ? `${me.latitude},${me.longitude}` : '');
    if (key !== this.framedKey && this.canvas().nativeElement.clientWidth > 0) {
      map.invalidateSize();
      this.framedKey = key;
      const points: L.LatLngTuple[] = markers.map((m) => [m.latitude, m.longitude]);
      if (me) points.push([me.latitude, me.longitude]);
      if (points.length === 1) map.setView(points[0]!, 13);
      else if (points.length > 1)
        map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
      else map.fitBounds(TUNISIA);
    }
  }

  private drawPin(): void {
    const map = this.map;
    if (!map || !this.pickable()) return;
    const pin = this.pin();
    if (!pin) {
      this.pinMarker?.remove();
      this.pinMarker = null;
      return;
    }
    if (!this.pinMarker) {
      this.pinMarker = L.marker([pin.latitude, pin.longitude], {
        draggable: true,
        icon: L.divIcon({
          className: 'ac-pin-host',
          html: '<div class="ac-drop"></div>',
          iconSize: [0, 0],
        }),
      })
        .on('dragend', () => {
          const at = this.pinMarker!.getLatLng();
          this.picked.emit({ latitude: at.lat, longitude: at.lng });
        })
        .addTo(map);
      map.setView([pin.latitude, pin.longitude], Math.max(map.getZoom(), 14));
    } else {
      this.pinMarker.setLatLng([pin.latitude, pin.longitude]);
    }
  }
}
