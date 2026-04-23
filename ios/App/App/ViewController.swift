import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Fondo del contenedor nativo
        self.view.backgroundColor = UIColor(
            red: 2.0 / 255.0,
            green: 6.0 / 255.0,
            blue: 23.0 / 255.0,
            alpha: 1.0
        )

        // Fondo del WebView
        bridge?.webView?.isOpaque = false
        bridge?.webView?.backgroundColor = .clear
        bridge?.webView?.scrollView.backgroundColor = UIColor(
            red: 2.0 / 255.0,
            green: 6.0 / 255.0,
            blue: 23.0 / 255.0,
            alpha: 1.0
        )

        // Evita comportamientos raros de inset
        if #available(iOS 11.0, *) {
            bridge?.webView?.scrollView.contentInsetAdjustmentBehavior = .never
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        self.view.backgroundColor = UIColor(
            red: 2.0 / 255.0,
            green: 6.0 / 255.0,
            blue: 23.0 / 255.0,
            alpha: 1.0
        )

        bridge?.webView?.backgroundColor = .clear
        bridge?.webView?.scrollView.backgroundColor = UIColor(
            red: 2.0 / 255.0,
            green: 6.0 / 255.0,
            blue: 23.0 / 255.0,
            alpha: 1.0
        )
    }
}