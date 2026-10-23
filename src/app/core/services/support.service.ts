import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TicketRole = 'cedente' | 'comercio' | 'sin-cuenta';

export interface CreateTicketRequest {
  motivo: string;
  rol: TicketRole;
  nombre: string;
  email: string;
  mensaje: string;
  origen?: string;
  faqsVistas?: string[];
  /** Captura opcional como data URL (solo con motivo `problema`). */
  captura?: string;
  /** Honeypot: siempre vacío para personas. */
  website?: string;
}

export interface CreateTicketResponse {
  ticketId: string;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly http = inject(HttpClient);

  /** POST /support/tickets: público; si hay sesión, el jwt.interceptor agrega el token igual. */
  createTicket(payload: CreateTicketRequest): Observable<CreateTicketResponse> {
    return this.http.post<CreateTicketResponse>(`${environment.apiUrl}/support/tickets`, payload);
  }
}
